const modulename = 'PlayerlistManager';
import { cloneDeep } from 'lodash-es';
import logger from '@core/extras/console.js';
import { verbose } from '@core/globalData';
import TxAdmin from '@core/txAdmin.js';
import { ServerPlayer } from '@core/playerLogic/playerClasses.js';
const { dir, log, logOk, logWarn, logError } = logger(modulename);


type PlayerDatabaseConfigType = {
    onJoinCheckBan: boolean;
    onJoinCheckWhitelist: boolean;
    whitelistRejectionMessage: string;
    wipePendingWLOnStart: boolean;
}
/**
 * The PlayerlistManager will store a ServerPlayer instance for all players that connected to the server.
 * This class will also keep an array of ['mutex#id', license], to be used for searches from server log clicks.
 * The licenseCache will contain only the licenses from last 50k disconnected players, which should be one entire
 *  session for the q99.9 servers out there and weight around 4mb.
 * The idea is: all players with license will be in the database, so storing only license is enough to find them.
 */
export default class PlayerlistManager {
    readonly #txAdmin: TxAdmin;
    playerlist: (ServerPlayer | undefined)[] = [];
    licenseCache: [mutexid: string, license: string][] = [];
    licenseCacheLimit = 50_000; //mutex+id+license * 50_000 = ~4mb

    constructor(
        txAdmin: TxAdmin,
        public config: PlayerDatabaseConfigType
    ) {
        this.#txAdmin = txAdmin;
    }


    /**
     * Handler for server restart - it will kill all players and reset the licenseCache
     * We MUST do .disconnect() for all players to clear the timers.
     * NOTE: it's ok for us to overfill before slicing the licenseCache because it's at most ~4mb
     */
    handleServerStop(oldMutex: string) {
        this.licenseCache = [];
        for (const player of this.playerlist) {
            if (player) {
                player.disconnect();
                if (player.license) {
                    this.licenseCache.push([`${oldMutex}#${player.netid}`, player.license]);
                }
            }
        }
        this.licenseCache = this.licenseCache.slice(-this.licenseCacheLimit);
        this.playerlist = [];
    }


    /**
     * Returns a playerlist array with ServerPlayer data.
     * The data is cloned to prevent pollution.
     */
    getPlayerList() {
        return this.playerlist
            .filter(p => p?.isConnected)
            .map((p) => {
                return cloneDeep({
                    netid: p!.netid,
                    displayName: p!.displayName,
                    pureName: p!.pureName,
                    ids: p!.ids,
                    license: p!.license,
                });
            });
    }


    /**
     * Handler for all txAdminPlayerlistEvent structured trace events
     */
    async handleServerEvents(payload: any, mutex: string) {
        if (payload.event === 'playerJoining') {
            try {
                if (typeof payload.id !== 'number') throw new Error(`invalid player id`);
                if (typeof this.playerlist[payload.id] !== 'undefined') throw new Error(`duplicated player id`);
                //TODO: pass serverInstance instead of playerDatabase
                this.playerlist[payload.id] = new ServerPlayer(payload.id, payload.player, this.#txAdmin.playerDatabase);
                this.#txAdmin.logger.server.write([{
                    type: 'playerJoining',
                    src: payload.id,
                    ts: Date.now(),
                    data: { ids: this.playerlist[payload.id]!.ids }
                }], mutex);
            } catch (error) {
                if (verbose) logWarn(`playerJoining event error: ${(error as Error).message}`);
            }

        } else if (payload.event === 'playerDropped') {
            try {
                if (typeof payload.id !== 'number') throw new Error(`invalid player id`);
                if (!(this.playerlist[payload.id] instanceof ServerPlayer)) throw new Error(`player id not found`);
                this.playerlist[payload.id]!.disconnect();
                this.#txAdmin.logger.server.write([{
                    type: 'playerDropped',
                    src: payload.id,
                    ts: Date.now(),
                    data: { reason: payload.reason }
                }], mutex);
            } catch (error) {
                if (verbose) logWarn(`playerDropped event error: ${(error as Error).message}`);
            }
        } else {
            logWarn(`Invalid event: ${payload?.event}`);
        }
    }
};
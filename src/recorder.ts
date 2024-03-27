import { statfs } from 'fs/promises';
import { execa, ExecaChildProcess } from 'execa';
import { format } from 'date-fns/format';
import { logger } from './logger.js';
import { ensureDir } from 'fs-extra';

export interface StreamRecord {
    url: string;
    pid: ExecaChildProcess;
    startTime: Date;
}

export class Recorder {
    private activeRecordings: StreamRecord[] = [];

    constructor() {
    }

    public async add(url: string, title: string) {
        await ensureDir('./out');

        const filename = `./out/${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}-${title}.mkv`;
        const freeSpace = await Recorder.getFreeSpace();

        if (freeSpace.freeAvailableG < 2) {
            logger.warn(`Recorder: can't start, not enough free space (${freeSpace.freeAvailableG}G)`);
            return false;
        }

        const record = this.activeRecordings.find(record => record.url === url);
        if (record) {
            logger.warn(`Recorder: already in progress -- ${record.url} from ` +
                `${format(record.startTime, 'yyyy-MM-dd_HH-mm-ss')}`);
            return false;
        }

        try {
            logger.info(`Recorder: start -- ${url}, free: ${freeSpace.freeAvailableG}G`);
            const process = execa('streamlink', [url, 'best', '-o', filename]);

            logger.info(`Recorder: started -- ${url}, filename ${filename}`);
            this.activeRecordings.push({
                url: url,
                pid: process,
                startTime: new Date(),
            });

            return true;

        } catch (e) {
            if (e instanceof Error) {
                logger.error(`Recorder: start error -- ${url} -- ${e.message}`);

            } else {
                logger.error(`Recorder: start error -- ${url} -- UNKNOWN ERROR`);
            }

            return false;
        }
    }

    public stopByUrl(url: string): boolean {
        logger.info(`Recorder: trying to stop -- ${url}`);
        const record = this.activeRecordings.find(record => record.url === url);

        if (record) {
            return this.stop(record);
        }

        logger.info(`Recorder: nothing to stop -- ${url}`);
        return false;
    }

    public stopAll() {
        for (const process of this.activeRecordings) {
            this.stop(process);
        }
    }

    public getActiveRecordings(): StreamRecord[] {
        return this.activeRecordings;
    }

    private stop(record: StreamRecord): boolean {
        const result = record.pid.kill();
        logger.info(`Recorder: ${result ? '[+]' : '[-]'} stop -- ${record.url}`);
        return result;
    }

    static async getFreeSpace() {
        const stats = await statfs('./');
        const _BYTES_TO_GB = 1024 * 1024 * 1024;

        return {
            freeAvailableG: stats.bavail * stats.bsize / _BYTES_TO_GB,
            freeTotalG: stats.bfree * stats.bsize / _BYTES_TO_GB,
        }
    }
}

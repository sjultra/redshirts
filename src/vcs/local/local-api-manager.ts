import { spawnSync } from 'node:child_process';
import path = require('node:path');
import { ApiManager } from '../../common/api-manager';
import { Repo } from '../../common/types';
import { LOGGER, splitAndCombine } from '../../common/utils';
import { LocalCommit } from './local-types';

// TODO author or committer?
const GIT_COMMAND = 'git';
const COMMIT_MARKER = '--commit--';
const GIT_LOG_ARGS = [
    'log',
    '--all',
    '--date=raw',
    `--format="${COMMIT_MARKER}%nauthor:%an%nemail:%ae%ndate:%at%n"`,
    '--since'
];
const DEFAULT_COMMAND_OPTS = {
    shell: true,
};

export class LocalApiManager extends ApiManager {

    async getCommits(repo: Repo, sinceDate: Date): Promise<LocalCommit[]> {
        
        // git log in unix seconds
        const timestamp = Math.floor(sinceDate.getTime() / 1000);
        const args = [...GIT_LOG_ARGS, timestamp.toString()];

        const repoPath = path.join(repo.owner, repo.name);

        const opts = {
            ...DEFAULT_COMMAND_OPTS,
            cwd: repoPath
        };

        console.debug(`Running git log command on directory ${repoPath}`);

        const git = spawnSync(GIT_COMMAND, args, opts);

        const status = git.status;

        console.debug(`git log exit code: ${status}`);

        if (status === 0) {
            const stdout = git.stdout.toString();
            console.debug(stdout);

            const lines = stdout.split('\n');
            console.debug(`Got ${lines.length} lines of output`);

            // 5 lines per commit plus a newline at the end
            if ((lines.length - 1) % 5 !== 0) {
                throw new Error('Got unexpected number of lines in the git log output');
            }

            const commits: LocalCommit[] = [];

            let lineNumber = 0;
            // skip final newline
            while (lineNumber < lines.length - 1) {
                const line = lines[lineNumber].trim();
                if (line !== COMMIT_MARKER) {
                    console.error(`Found unexpected line (expecting '${COMMIT_MARKER}'): ${line}`);
                }

                const [authorLine, emailLine, timestampLine] = lines.slice(lineNumber + 1, lineNumber + 4);

                commits.push({
                    name: splitAndCombine(authorLine, ':', 2)[1],
                    email: splitAndCombine(emailLine, ':', 2)[1],
                    timestamp: Number.parseInt(splitAndCombine(timestampLine, ':', 2)[1] + '000', 10)  // need to convert from seconds to ms
                });

                lineNumber += 5;  // the commit marker, the 3 lines above, and the blank line
            }

            return commits;

        } else {
            const stderr = git.stderr.toString();
            console.error(`Got unexpected exit code from git log command. ${LOGGER.level === 'debug' ? 'Stderr output:' : 'Re-run with LOG_LEVEL=debug to see stderr output.'}`);
            console.debug(stderr);
            throw git.error || new Error(`Error executing git log command for ${repoPath}`);
        }
    }
}

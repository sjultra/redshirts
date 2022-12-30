import { Flags } from '@oclif/core';
import { commonFlags } from '../common/flags';
import RedshirtsVcsCommand from '../common/redshirts-command';
import { HelpGroup, SourceInfo, SourceType } from '../common/types';
import { BitbucketApiManager } from '../vcs/bitbucket/bitbucket-api-manager';
import { BitbucketRunner } from '../vcs/bitbucket/bitbucket-runner';

export default class Bitbucket extends RedshirtsVcsCommand {
    static summary = 'Count active contributors for Bitbucket repos'

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --username my_username --token ATBBXXX --repos bridgecrewio/checkov,try-bridgecrew/terragoat`,
        `$ <%= config.bin %> <%= command.id %> --username my_username --token ATBBXXX --workspaces bridgecrewio,try-bridgecrew`,
    ]

    static flags = {
        username: Flags.string({
            description: 'Your Bitbucket username associated with the provided app token',
            char: 'u',
            required: true,
            helpGroup: HelpGroup.AUTH
        }),
        token: Flags.string({
            char: 't',
            description: 'A Bitbucket app token tied to the provided username. This token must be tied to a user that has sufficient visibility of the repo(s) being counted.',
            required: true,
            helpGroup: HelpGroup.AUTH
        }),
        workspaces: Flags.string({
            description: 'A comma separated list of workspace and / or usernames for which to fetch repos. Use the --repos option to add additional specific repos on top of those in the specified workspace(s). Use the --skip-repos option to exclude individual repos that are a part of these workspace(s).',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC
        }),
        ...commonFlags,
    }

    async run(): Promise<void> {
        const { flags } = await this.parse(Bitbucket);

        const sourceInfo = this.getSourceInfo(`${flags.username}:${flags.token}`);

        const apiManager = new BitbucketApiManager(sourceInfo, flags['ca-cert']);
        const runner = new BitbucketRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }

    getSourceInfo(token: string, baseUrl = 'https://api.bitbucket.org/2.0', sourceType = SourceType.Bitbucket): SourceInfo {
        return {
            sourceType: sourceType,
            url: baseUrl,
            token: token,
            repoTerm: 'repo',
            orgTerm: 'workspace',
            orgFlagName: 'workspaces',
            minPathLength: 2,
            maxPathLength: 2
        };
    }
}
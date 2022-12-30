import { Flags } from '@oclif/core';
import { CLIError } from '@oclif/errors';
import { commonFlags } from '../common/flags';
import RedshirtsVcsCommand from '../common/redshirts-command';
import { HelpGroup, SourceInfo, SourceType } from '../common/types';
import { AzureApiManager } from '../vcs/azure/azure-api-manager';
import { AzureRunner } from '../vcs/azure/azure-runner';

// TODO access notes:
// user must be at least "basic" in the ADO org (which is higher than you get by default if you add a user to a team)

export default class AzureDevOps extends RedshirtsVcsCommand {

    static summary = 'Count active contributors for Azure DevOps repos'

    static description = 'Note: you must provide --repos, --projects, and / or --orgs. Due to limitations in Azure DevOps APIs, it is not possible to use a personal access token to fetch all orgs and repos for a user.'

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --token obnwxxx --repos org/project/repo,org/project/repo2,org/project2/repo`,
        `$ <%= config.bin %> <%= command.id %> --token obnwxxx --orgs bridgecrewio,try-bridgecrew`,
        `$ <%= config.bin %> <%= command.id %> --token obnwxxx --orgs bridgecrewio,try-bridgecrew --projects org/project`,
    ]

    static flags = {
        token: Flags.string({
            char: 't',
            description: 'An Azure DevOps user personal access token tied to the provided username. This token must be tied to a user that has sufficient visibility of the repo(s) being counted.',
            required: true,
            helpGroup: HelpGroup.AUTH
        }),
        orgs: Flags.string({
            description: 'Org names for which to fetch repos. Use the --repos and / or --projects options to add additional specific repos on top of those in the specified org(s). Use the --skip-repos and / or --skip-projects options to exclude individual repos or projects that are a part of these org(s).',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC
        }),
        projects: Flags.string({
            description: 'Project names for which to fetch repos. Use the --repos option to add additional specific repos on top of those in the specified project(s). Use the --skip-repos option to exclude individual repos that are a part of these project(s).',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC
        }),
        'skip-projects': Flags.string({
            description: 'Project names for which to skip fetching repos. Use this option to skip projects that are part of the specified orgs. If the same project is included in both --projects and --skip-projects, it is skipped. If a repo from a skipped project is included in --repos, it is also still skipped.',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC
        }),
        ...commonFlags,
    }

    async run(): Promise<void> {
        const { flags } = (await this.parse(AzureDevOps));

        const sourceInfo = this.getSourceInfo(':' + flags.token);

        const apiManager = new AzureApiManager(sourceInfo, flags['ca-cert']);
        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        if (!(flags.orgs || flags.projects || flags.repos || flags['repo-file'])) {
            throw new CLIError('At least one of --orgs, --projects, --repos, or --repo-file is required for Azure DevOps');
        }

        await runner.execute();
    }

    getSourceInfo(token: string, baseUrl = 'https://dev.azure.com', sourceType = SourceType.AzureRepos): SourceInfo {
        return {
            sourceType: sourceType,
            url: baseUrl,
            token: token,
            repoTerm: 'repo',
            orgTerm: 'organization',
            orgFlagName: 'orgs',
            minPathLength: 3,
            maxPathLength: 3
        };
    }
}
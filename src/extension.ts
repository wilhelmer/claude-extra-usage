import * as vscode from 'vscode';
import * as https from 'https';

let statusBarItem: vscode.StatusBarItem;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let extensionContext: vscode.ExtensionContext;

const ORG_ID_SECRET = 'claudeExtraUsage.organizationId';
const SESSION_KEY_SECRET = 'claudeExtraUsage.sessionKey';

export function activate(context: vscode.ExtensionContext): void {
    extensionContext = context;

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(
        vscode.commands.registerCommand('claudeExtraUsage.refresh', refresh)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeExtraUsage.configure', configure)
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('claudeExtraUsage.refreshInterval')) {
                scheduleRefresh();
            }
        })
    );

    migrateSettings().then(() => {
        scheduleRefresh();
        refresh();
    });
}

async function migrateSettings(): Promise<void> {
    const config = vscode.workspace.getConfiguration('claudeExtraUsage');
    const legacyOrgId = config.get<string>('organizationId', '').trim();
    const legacyKey = config.get<string>('sessionKey', '').trim();
    if (!legacyOrgId && !legacyKey) { return; }

    if (legacyOrgId) {
        await extensionContext.secrets.store(ORG_ID_SECRET, legacyOrgId);
        await config.update('organizationId', undefined, vscode.ConfigurationTarget.Global);
        await config.update('organizationId', undefined, vscode.ConfigurationTarget.Workspace);
    }
    if (legacyKey) {
        await extensionContext.secrets.store(SESSION_KEY_SECRET, legacyKey);
        await config.update('sessionKey', undefined, vscode.ConfigurationTarget.Global);
        await config.update('sessionKey', undefined, vscode.ConfigurationTarget.Workspace);
    }
    vscode.window.showInformationMessage('Claude Extra Usage: Settings migrated to secure storage and removed from settings.');
}

async function configure(): Promise<void> {
    const existingOrgId = await extensionContext.secrets.get(ORG_ID_SECRET);
    const existingKey = await extensionContext.secrets.get(SESSION_KEY_SECRET);

    const orgId = await vscode.window.showInputBox({
        prompt: 'Enter your Claude organization ID. See https://claude.ai/settings/account.',
        value: existingOrgId ?? '',
        ignoreFocusOut: true,
    });
    if (orgId === undefined) { return; }

    const key = await vscode.window.showInputBox({
        prompt: 'Enter your Claude session key. To retrieve it, open https://claude.ai, open dev tools (F12), and go to Application > Storage > Cookies > sessionKey.',
        password: true,
        value: existingKey ?? '',
        ignoreFocusOut: true,
    });
    if (key === undefined) { return; }

    if (orgId.trim()) {
        await extensionContext.secrets.store(ORG_ID_SECRET, orgId.trim());
    } else {
        await extensionContext.secrets.delete(ORG_ID_SECRET);
    }
    if (key.trim()) {
        await extensionContext.secrets.store(SESSION_KEY_SECRET, key.trim());
    } else {
        await extensionContext.secrets.delete(SESSION_KEY_SECRET);
    }
    refresh();
}

function scheduleRefresh(): void {
    clearInterval(refreshTimer);
    const intervalMs = vscode.workspace.getConfiguration('claudeExtraUsage')
        .get<number>('refreshInterval', 10) * 60 * 1000;
    refreshTimer = setInterval(refresh, intervalMs);
}

function refresh(): void {
    Promise.all([
        extensionContext.secrets.get(ORG_ID_SECRET),
        extensionContext.secrets.get(SESSION_KEY_SECRET),
    ]).then(([orgId, sessionKey]) => {
        if (!orgId || !sessionKey) {
            statusBarItem.text = '$(sparkle) Not configured';
            statusBarItem.tooltip = 'Click to configure Claude Extra Usage.';
            statusBarItem.command = 'claudeExtraUsage.configure';
            statusBarItem.show();
            return;
        }

        statusBarItem.command = 'claudeExtraUsage.refresh';
        statusBarItem.text = '$(sparkle~spin) Refreshing...';
        statusBarItem.show();

        fetchUsage(orgId, sessionKey).then(({ spent, limit, utilization }) => {
            const pct = Math.round(utilization);
            statusBarItem.text = `$(sparkle) ${pct}% used`;
            statusBarItem.tooltip = `$${(spent / 100).toFixed(2)} of $${(limit / 100).toFixed(2)} spent`;
        }).catch(err => {
            statusBarItem.text = '$(warning) Error';
            statusBarItem.tooltip = `Failed to fetch usage: ${err instanceof Error ? err.message : String(err)}`;
        });
    });
}

interface UsageResponse {
    extra_usage: {
        is_enabled: boolean;
        monthly_limit: number;
        used_credits: number;
        utilization: number;
    } | null;
}

function fetchUsage(orgId: string, sessionKey: string): Promise<{ spent: number; limit: number; utilization: number }> {
    return new Promise((resolve, reject) => {
        const req = https.request(
            `https://claude.ai/api/organizations/${orgId}/usage`,
            {
                method: 'GET',
                headers: {
                    'cookie': `sessionKey=${sessionKey}`,
                    'accept': 'application/json, text/plain, */*',
                    'origin': 'https://claude.ai',
                    'referer': 'https://claude.ai/',
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
                },
            },
            res => {
                let body = '';
                res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}`));
                        return;
                    }
                    try {
                        const json = JSON.parse(body) as UsageResponse;
                        const eu = json.extra_usage;
                        if (!eu?.is_enabled) {
                            reject(new Error('extra usage not enabled on this account'));
                            return;
                        }
                        resolve({
                            spent: eu.used_credits,
                            limit: eu.monthly_limit,
                            utilization: eu.utilization,
                        });
                    } catch (e) {
                        reject(e);
                    }
                });
            }
        );
        req.on('error', reject);
        req.end();
    });
}

export function deactivate(): void {
    clearInterval(refreshTimer);
}

import * as vscode from 'vscode';
import * as https from 'https';

let statusBarItem: vscode.StatusBarItem;
let refreshTimer: ReturnType<typeof setInterval> | undefined;

export function activate(context: vscode.ExtensionContext): void {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'claudeExtraUsage.refresh';
    context.subscriptions.push(statusBarItem);

    const refreshCmd = vscode.commands.registerCommand('claudeExtraUsage.refresh', refresh);
    context.subscriptions.push(refreshCmd);

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('claudeExtraUsage')) {
                scheduleRefresh();
                refresh();
            }
        })
    );

    scheduleRefresh();
    refresh();
}

function scheduleRefresh(): void {
    clearInterval(refreshTimer);
    const intervalMs = vscode.workspace.getConfiguration('claudeExtraUsage')
        .get<number>('refreshInterval', 10) * 60 * 1000;
    refreshTimer = setInterval(refresh, intervalMs);
}

function refresh(): void {
    const config = vscode.workspace.getConfiguration('claudeExtraUsage');
    const orgId = config.get<string>('organizationId', '').trim();
    const sessionKey = config.get<string>('sessionKey', '').trim();

    if (!orgId || !sessionKey) {
        statusBarItem.text = '$(sparkle) Not configured';
        statusBarItem.tooltip = 'Configure organization ID and session key to use the Claude Extra Usage extension.';
        statusBarItem.show();
        return;
    }

    statusBarItem.text = '$(sparkle~spin) Refreshing ...';
    statusBarItem.show();

    fetchUsage(orgId, sessionKey).then(({ spent, limit, utilization }) => {
        const pct = Math.round(utilization);
        statusBarItem.text = `$(sparkle) ${pct}% used`;
        statusBarItem.tooltip = `$${(spent / 100).toFixed(2)} of $${(limit / 100).toFixed(2)} spent`;
    }).catch(err => {
        statusBarItem.text = '$(warning) Error';
        statusBarItem.tooltip = `Failed to fetch usage: ${err instanceof Error ? err.message : String(err)}`;
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

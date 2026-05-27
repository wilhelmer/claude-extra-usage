import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CACHE_FILE = path.join(os.homedir(), '.claude', 'claude-usage-bar-cache.json');

interface ExtraUsage {
    isEnabled: boolean;
    monthlyLimit: number;
    usedCredits: number;
    utilization: number;
}

interface UsageCache {
    usage: { extraUsage: ExtraUsage | null } | null;
    error: string | null;
}

let statusBarItem: vscode.StatusBarItem;
let fileWatcher: fs.StatWatcher | undefined;

export function activate(context: vscode.ExtensionContext): void {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'claudeUsage.refresh';
    context.subscriptions.push(statusBarItem);

    const refreshCmd = vscode.commands.registerCommand('claudeUsage.refresh', refresh);
    context.subscriptions.push(refreshCmd);

    fileWatcher = fs.watchFile(CACHE_FILE, { interval: 10_000 }, refresh);

    context.subscriptions.push({ dispose: () => fs.unwatchFile(CACHE_FILE) });

    refresh();
}

function refresh(): void {
    try {
        const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as UsageCache;
        const extra = cache.usage?.extraUsage;

        if (!extra?.isEnabled) {
            statusBarItem.hide();
            return;
        }

        const spent = extra.usedCredits / 100;
        const limit = extra.monthlyLimit / 100;
        const pct = Math.round(extra.utilization);

        statusBarItem.text = `Claude: ${pct}% used`;
        statusBarItem.tooltip = `$${spent.toFixed(2)} of $${limit.toFixed(2)} spent`;
        statusBarItem.show();
    } catch {
        statusBarItem.hide();
    }
}

export function deactivate(): void {
    fs.unwatchFile(CACHE_FILE);
}

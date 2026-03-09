import { useState } from 'react';
import { Copy, Check, Code2, Terminal, Package, Globe } from 'lucide-react';

function CopyBlock({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group">
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto text-sm font-mono text-slate-300">
                <code>{code}</code>
            </pre>
            <button
                onClick={handleCopy}
                className="absolute top-3 right-3 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 opacity-0 group-hover:opacity-100 transition-all"
            >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
        </div>
    );
}

export default function SdkSetup() {
    const [activeTab, setActiveTab] = useState<'script' | 'npm' | 'react'>('script');

    const scriptTag = `<!-- OnboardKit SDK -->
<script src="https://cdn.onboardkit.com/sdk/v1/onboardkit.min.js"></script>
<script>
  OnboardKit.init({
    flowId: 'YOUR_FLOW_ID',
    apiKey: 'ok_live_YOUR_API_KEY',
    userId: 'current-user-id',
    container: '#onboarding',
    onComplete: function() {
      console.log('Onboarding complete!');
    }
  });
</script>`;

    const npmInstall = `npm install @onboardkit/sdk`;

    const npmUsage = `import OnboardKit from '@onboardkit/sdk';

OnboardKit.init({
  flowId: 'YOUR_FLOW_ID',
  apiKey: 'ok_live_YOUR_API_KEY',
  userId: currentUser.id,
  container: '#onboarding',
  onComplete: () => {
    console.log('Onboarding complete!');
  },
  onStepChange: (step) => {
    console.log('Step changed:', step);
  }
});`;

    const reactUsage = `import { useEffect, useRef } from 'react';
import OnboardKit from '@onboardkit/sdk';

function OnboardingWidget({ userId, flowId }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    OnboardKit.init({
      flowId,
      apiKey: 'ok_live_YOUR_API_KEY',
      userId,
      container: containerRef.current,
      onComplete: () => {
        console.log('Onboarding complete!');
      }
    });

    return () => OnboardKit.destroy();
  }, [flowId, userId]);

  return <div ref={containerRef} />;
}`;

    const tabs = [
        { key: 'script' as const, label: 'Script Tag', icon: Globe },
        { key: 'npm' as const, label: 'NPM', icon: Package },
        { key: 'react' as const, label: 'React', icon: Code2 },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">SDK Setup</h1>
                <p className="text-slate-400">Install and configure the OnboardKit SDK in your application</p>
            </div>

            {/* API Key */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Terminal className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">API Key</h2>
                        <p className="text-xs text-slate-500">Use this key to authenticate SDK requests</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <code className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-brand-400">
                        ok_live_••••••••••••••••
                    </code>
                    <button className="px-4 py-3 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold border border-slate-700 hover:bg-slate-700 transition-colors">
                        Reveal
                    </button>
                    <button className="px-4 py-3 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold border border-slate-700 hover:bg-slate-700 transition-colors">
                        Regenerate
                    </button>
                </div>
                <p className="text-xs text-slate-600">
                    Keep your API key secret. Never expose it in client-side code for production — use environment variables.
                </p>
            </div>

            {/* Installation */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white">Installation</h2>

                {/* Tabs */}
                <div className="flex gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                activeTab === tab.key
                                    ? 'bg-brand-600/10 text-brand-400 border-brand-500/20'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'script' && (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-400">Add this snippet before your closing <code className="text-brand-400">&lt;/body&gt;</code> tag:</p>
                        <CopyBlock code={scriptTag} />
                    </div>
                )}

                {activeTab === 'npm' && (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-400">Install the package:</p>
                        <CopyBlock code={npmInstall} />
                        <p className="text-sm text-slate-400 mt-4">Then initialize in your app:</p>
                        <CopyBlock code={npmUsage} />
                    </div>
                )}

                {activeTab === 'react' && (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-400">Install the package, then use this component pattern:</p>
                        <CopyBlock code={reactUsage} />
                    </div>
                )}
            </div>

            {/* Configuration Options */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white">Configuration Options</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Option</th>
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Type</th>
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Required</th>
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                ['flowId', 'string', 'Yes', 'The ID of the onboarding flow to display'],
                                ['apiKey', 'string', 'Yes', 'Your OnboardKit API key'],
                                ['userId', 'string', 'Yes', 'Unique identifier for the current user'],
                                ['container', 'string | HTMLElement', 'No', 'CSS selector or element. Auto-creates modal if omitted'],
                                ['onComplete', '() => void', 'No', 'Callback when flow is completed'],
                                ['onStepChange', '(step) => void', 'No', 'Callback when user advances to next step'],
                                ['theme', 'object', 'No', 'Custom colors and fonts'],
                            ].map(([opt, type, required, desc]) => (
                                <tr key={opt} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                    <td className="py-3 px-4 font-mono text-brand-400">{opt}</td>
                                    <td className="py-3 px-4 text-slate-300 font-mono text-xs">{type}</td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                            required === 'Yes'
                                                ? 'text-amber-400 bg-amber-500/10'
                                                : 'text-slate-500 bg-slate-800'
                                        }`}>{required}</span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-400">{desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

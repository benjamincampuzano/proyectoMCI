/**
 * DashboardSkeleton provides shimmering loading placeholders
 * following Linear's dark theme palette.
 */
const DashboardSkeleton = () => {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Top KPIs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div
                        key={i}
                        className="rounded-[20px] p-5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-24 h-4 bg-white/5 rounded-md" />
                            <div className="w-9 h-9 bg-white/5 rounded-xl" />
                        </div>
                        <div className="w-16 h-8 bg-white/10 rounded-lg" />
                        <div className="w-32 h-3 bg-white/5 rounded" />
                    </div>
                ))}
            </div>

            {/* Secondary Grid (Charts + Feed) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-[24px] p-6 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] space-y-4 min-h-[360px]">
                    <div className="flex justify-between items-center">
                        <div className="w-40 h-5 bg-white/10 rounded-md" />
                        <div className="w-24 h-4 bg-white/5 rounded" />
                    </div>
                    <div className="w-full h-[260px] bg-white/[0.02] rounded-xl border border-white/5" />
                </div>

                <div className="rounded-[24px] p-6 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] space-y-4">
                    <div className="w-36 h-5 bg-white/10 rounded-md" />
                    <div className="space-y-3 pt-2">
                        {[1, 2, 3, 4].map(n => (
                            <div key={n} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white/5 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="w-3/4 h-3 bg-white/10 rounded" />
                                    <div className="w-1/2 h-2.5 bg-white/5 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardSkeleton;

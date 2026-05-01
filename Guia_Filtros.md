### Creacion de Botones para ocultar y Mostrar los Filtros con su respectivo Filtro ###

    <button
        onClick={() => setShowFilters(!showFilters)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            hasActiveFilters
                 ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
    >
        <Funnel size={18} weight={showFilters ? "fill" : "bold"} />
        Filtros
        {hasActiveFilters && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                  {[startDate, endDate, (liderDoceFilter && !isLiderDoceFilterAutoApplied), pendingCalls, pendingVisits].filter(Boolean).length}
            </span>
        )}
    </button>

### Filtros por fechas ###



### Filtros por Lideres ###

    <div className="flex-[2] min-w-[250px]">
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Líder de 12
        </label>
        <AsyncSearchSelect
            fetchItems={(term) => {
                const roleFilter = user?.roles?.includes('PASTOR') ? "LIDER_DOCE,PASTOR" : "LIDER_DOCE";
                return api.get('/users/search', {
                     params: { search: term, role: roleFilter }
                }).then(res => res.data);
             }}
            selectedValue={liderDoceFilter}
            onSelect={(user) => {
                 setLiderDoceFilter(user || null);
                setCurrentPage(1);
            }}
            placeholder="Buscar líder de 12..."
            labelKey="fullName"
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
        />
    </div>

### Guia para Checkboxes

    <label className="flex items-center gap-2 cursor-pointer group">
        <div className={`relative flex items-center justify-center w-5 h-5 rounded border-2 transition-all ${
            pendingCalls
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 dark:border-gray-600 group-hover:border-green-400'
        }`}>
            <input
                type="checkbox"
                checked={pendingCalls}
                onChange={(e) => {
                    setPendingCalls(e.target.checked);
                    setCurrentPage(1);
                }}
                className="absolute opacity-0 w-full h-full cursor-pointer"
            />
            {pendingCalls && <CheckCircle size={14} className="text-white" weight="fill" />}
        </div>
        <span className={`text-sm font-medium ${pendingCalls ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
            Pendientes por llamadas
        </span>
    </label>
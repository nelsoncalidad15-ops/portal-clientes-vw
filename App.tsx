import React, { useState, useCallback } from 'react';
import { findCustomerByDni } from './services/sheetService';
import { generateCustomerMessage } from './services/geminiService';
import type { Customer } from './types';
import { VWLogo } from './components/VWLogo';
import { LoadingSpinner } from './components/LoadingSpinner';

// --- Helper Functions and Components for Status Tracker ---

type Status = 'completed' | 'inprogress' | 'pending';

const getStatus = (text: string): Status => {
    if (!text || text === '#N/A') return 'pending';
    const upperText = text.toUpperCase().trim();

    // Negative/Pending states first
    if (['NO', 'FALSE', 'NO ENVIADO', '#N/D', 'PENDIENTE'].includes(upperText)) {
        return 'pending';
    }

    // Completed states
    if (['OK', 'LISTO', 'FINALIZADO', 'COMPLETADO', 'SI', 'TRUE'].includes(upperText) || upperText.includes('FACTURADA')) {
        return 'completed';
    }
    
    // Any other non-empty text is considered an in-progress update
    return 'inprogress';
};


const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const StatusStep: React.FC<{ status: Status; label: string; details: string; }> = ({ status, label, details }) => {
    const statusClasses = {
        completed: {
            bg: 'bg-green-500',
            text: 'text-green-300',
            iconBg: 'bg-green-500/20 border-green-500/50',
        },
        inprogress: {
            bg: 'bg-blue-500',
            text: 'text-blue-300',
            iconBg: 'bg-blue-500/20 border-blue-500/50',
        },
        pending: {
            bg: 'bg-slate-600',
            text: 'text-slate-400',
            iconBg: 'bg-slate-700/30 border-slate-600/50',
        },
    };

    const currentStatus = statusClasses[status];

    return (
        <div className="flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${currentStatus.iconBg}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentStatus.bg}`}>
                    {status === 'completed' && <CheckIcon className="w-6 h-6 text-white" />}
                    {status === 'inprogress' && <LoadingSpinner />}
                    {status === 'pending' && <ClockIcon className="w-6 h-6 text-slate-300" />}
                </div>
            </div>
            <h4 className="font-bold mt-3 text-slate-200">{label}</h4>
            <p className={`text-sm ${currentStatus.text} capitalize`}>{details || 'Pendiente'}</p>
        </div>
    );
};

const StatusTracker: React.FC<{ customer: Customer }> = ({ customer }) => {
    const facturadoStatus = getStatus(customer['Facturado']);
    const tramiteStatus = getStatus(customer['Tramite en registro']);
    const preEntregaStatus = getStatus(customer['Pre - entrega']);

    const getConnectorClass = (status: Status) => {
        if (status === 'completed') return 'bg-green-500';
        if (status === 'inprogress') return 'bg-blue-500';
        return 'bg-slate-600';
    };

    return (
        <div className="w-full">
            <div className="flex items-center">
                <StatusStep status={facturadoStatus} label="Facturado" details={customer['Facturado'] || 'Pendiente'} />
                <div className={`flex-1 h-1 mx-2 ${getConnectorClass(tramiteStatus)}`}></div>
                <StatusStep status={tramiteStatus} label="Registro" details={customer['Tramite en registro']} />
                <div className={`flex-1 h-1 mx-2 ${getConnectorClass(preEntregaStatus)}`}></div>
                <StatusStep status={preEntregaStatus} label="Pre-Entrega" details={customer['Pre - entrega']} />
            </div>
        </div>
    );
};

// --- Main App Component ---

const App: React.FC = () => {
    const [dni, setDni] = useState<string>('');
    const [customerData, setCustomerData] = useState<Customer | null>(null);
    const [geminiMessage, setGeminiMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = useCallback(async () => {
        if (!dni) {
            setError('Por favor, ingrese un DNI.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setCustomerData(null);
        setGeminiMessage('');

        try {
            const customer = await findCustomerByDni(dni.trim());
            if (customer) {
                setCustomerData(customer);
                const message = await generateCustomerMessage(customer);
                setGeminiMessage(message);
            } else {
                setError('DNI no encontrado. Por favor, verifique los datos e intente nuevamente.');
            }
        } catch (err) {
            console.error(err);
            setError('Ocurrió un error al buscar los datos. Por favor, intente más tarde.');
        } finally {
            setIsLoading(false);
        }
    }, [dni]);
    
    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
            <div className="w-full max-w-3xl mx-auto">
                <header className="flex justify-center mb-8">
                    <VWLogo className="h-24 w-24 text-slate-300" />
                </header>

                <main className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700">
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
                            Portal de Clientes
                        </h1>
                        <p className="mt-2 text-lg text-slate-400">
                            Consulte el estado de su vehículo ingresando su DNI.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            value={dni}
                            onChange={(e) => setDni(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ingrese su DNI sin puntos"
                            className="flex-grow bg-slate-900/80 border border-slate-600 rounded-md py-3 px-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="bg-blue-600 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <LoadingSpinner />
                                    Buscando...
                                </>
                            ) : (
                                'Buscar'
                            )}
                        </button>
                    </div>

                    <div className="mt-8 min-h-[250px]">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-lg text-center">
                                {error}
                            </div>
                        )}

                        {customerData && (
                            <div className="space-y-6 animate-fade-in">
                                {geminiMessage && (
                                    <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
                                        <p className="text-lg text-slate-200 text-center">{geminiMessage}</p>
                                    </div>
                                )}
                                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 overflow-x-auto">
                                    <h3 className="text-xl font-semibold mb-6 text-slate-200 text-center">Estado del Proceso</h3>
                                    <StatusTracker customer={customerData} />
                                </div>
                                <div className="text-center mt-4 border-t border-slate-700 pt-4">
                                  <p className="text-slate-400">
                                      Cliente: <span className="font-semibold text-slate-200">{customerData.Cliente}</span>
                                  </p>
                                  <p className="text-slate-400">
                                      Asesor: <span className="font-semibold text-slate-200">{customerData.Vendedor}</span>
                                  </p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            <footer className="text-center py-4 mt-8 text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Volkswagen Argentina. Todos los derechos reservados.</p>
            </footer>
        </div>
    );
};

export default App;
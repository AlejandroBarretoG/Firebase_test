import React, { useState, useEffect } from 'react';
import { initFirebase, getConfigDisplay, FirebaseApp } from './services/firebase';
import { runGeminiTests } from './services/gemini';
import { StatusCard } from './components/StatusCard';
import { ShieldCheck, Server, Database, Settings, XCircle, Code2, ChevronDown, ChevronUp, Bot, Sparkles, KeyRound } from 'lucide-react';

interface TestStep {
  id: string;
  title: string;
  description: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  details?: string;
}

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCjk5g2nAAClXrTY4LOSxAzS0YNE8lsSgw",
  authDomain: "studio-5674530481-7e956.firebaseapp.com",
  projectId: "studio-5674530481-7e956",
  storageBucket: "studio-5674530481-7e956.firebasestorage.app",
  messagingSenderId: "651553916706",
  appId: "1:651553916706:web:79ce4d5791126f3288877b"
};

type AppMode = 'firebase' | 'gemini';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('firebase');
  
  // Firebase State
  const [firebaseInstance, setFirebaseInstance] = useState<FirebaseApp | null>(null);
  const [firebaseConfigInput, setFirebaseConfigInput] = useState<string>(JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2));
  const [showConfig, setShowConfig] = useState(true);
  
  // Gemini State
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  
  // Shared Steps State
  const [firebaseSteps, setFirebaseSteps] = useState<TestStep[]>([
    { id: 'config', title: 'Validación de Configuración', description: 'Analizando el JSON proporcionado.', status: 'idle' },
    { id: 'init', title: 'Inicialización del SDK', description: 'Ejecutando initializeApp() con la configuración.', status: 'idle' },
    { id: 'auth_module', title: 'Servicio de Autenticación', description: 'Verificando la instanciación del módulo Auth.', status: 'idle' }
  ]);

  const [geminiSteps, setGeminiSteps] = useState<TestStep[]>([
    { id: 'connect', title: 'Verificación de API Key', description: 'Intentando establecer conexión inicial con Gemini.', status: 'idle' },
    { id: 'text', title: 'Generación de Texto', description: 'Prompt simple "Hola mundo" a gemini-2.5-flash.', status: 'idle' },
    { id: 'stream', title: 'Prueba de Streaming', description: 'Verificando recepción de chunks en tiempo real.', status: 'idle' },
    { id: 'tokens', title: 'Conteo de Tokens', description: 'Verificando endpoint countTokens.', status: 'idle' },
    { id: 'vision', title: 'Capacidad Multimodal', description: 'Analizando imagen de prueba (Pixel).', status: 'idle' }
  ]);

  const updateStep = (mode: AppMode, id: string, updates: Partial<TestStep>) => {
    if (mode === 'firebase') {
      setFirebaseSteps(prev => prev.map(step => step.id === id ? { ...step, ...updates } : step));
    } else {
      setGeminiSteps(prev => prev.map(step => step.id === id ? { ...step, ...updates } : step));
    }
  };

  const runFirebaseTests = async () => {
    setFirebaseSteps(prev => prev.map(s => ({ ...s, status: 'idle', details: undefined })));
    setFirebaseInstance(null);
    
    // 1. Check Config
    updateStep('firebase', 'config', { status: 'loading' });
    await new Promise(resolve => setTimeout(resolve, 400)); 
    
    let parsedConfig: any;
    try {
      parsedConfig = JSON.parse(firebaseConfigInput);
      if (!parsedConfig.apiKey || !parsedConfig.projectId) throw new Error("Faltan campos requeridos (apiKey, projectId).");
      
      updateStep('firebase', 'config', { 
        status: 'success', 
        details: JSON.stringify(getConfigDisplay(parsedConfig), null, 2) 
      });
    } catch (e: any) {
      updateStep('firebase', 'config', { status: 'error', details: `JSON Inválido: ${e.message}` });
      return;
    }

    // 2. Initialize App
    updateStep('firebase', 'init', { status: 'loading' });
    await new Promise(resolve => setTimeout(resolve, 600));

    const result = await initFirebase(parsedConfig);
    
    if (result.success && result.app) {
      setFirebaseInstance(result.app);
      updateStep('firebase', 'init', { 
        status: 'success', 
        details: `App Name: "${result.app.name}"\nAutomatic Data Collection: ${result.app.automaticDataCollectionEnabled}`
      });
    } else {
      updateStep('firebase', 'init', { status: 'error', details: result.error?.message || result.message });
      return;
    }

    // 3. Check Auth
    updateStep('firebase', 'auth_module', { status: 'loading' });
    await new Promise(resolve => setTimeout(resolve, 600));
    
    if (result.auth) {
       updateStep('firebase', 'auth_module', { 
        status: 'success', 
        details: `Auth SDK cargado correctamente.\nCurrent User: ${result.auth.currentUser ? result.auth.currentUser.uid : 'null (No hay usuario logueado)'}`
      });
    } else {
       updateStep('firebase', 'auth_module', { status: 'error', details: 'No se pudo obtener la instancia de Auth.' });
    }
  };

  const runGeminiTestFlow = async () => {
    if (!geminiApiKey) {
      alert("Por favor ingresa una API Key de Gemini.");
      return;
    }
    setGeminiSteps(prev => prev.map(s => ({ ...s, status: 'idle', details: undefined })));

    // 1. Connection
    updateStep('gemini', 'connect', { status: 'loading' });
    const connResult = await runGeminiTests.connect(geminiApiKey);
    if (connResult.success) {
      updateStep('gemini', 'connect', { status: 'success', details: JSON.stringify(connResult.data, null, 2) });
    } else {
      updateStep('gemini', 'connect', { status: 'error', details: connResult.message });
      return; // Stop if connection fails
    }

    // 2. Text Generation
    updateStep('gemini', 'text', { status: 'loading' });
    const textResult = await runGeminiTests.generateText(geminiApiKey);
    if (textResult.success) updateStep('gemini', 'text', { status: 'success', details: JSON.stringify(textResult.data, null, 2) });
    else updateStep('gemini', 'text', { status: 'error', details: textResult.message });

    // 3. Streaming
    updateStep('gemini', 'stream', { status: 'loading' });
    const streamResult = await runGeminiTests.streamText(geminiApiKey);
    if (streamResult.success) updateStep('gemini', 'stream', { status: 'success', details: JSON.stringify(streamResult.data, null, 2) });
    else updateStep('gemini', 'stream', { status: 'error', details: streamResult.message });

    // 4. Tokens
    updateStep('gemini', 'tokens', { status: 'loading' });
    const tokenResult = await runGeminiTests.countTokens(geminiApiKey);
    if (tokenResult.success) updateStep('gemini', 'tokens', { status: 'success', details: JSON.stringify(tokenResult.data, null, 2) });
    else updateStep('gemini', 'tokens', { status: 'error', details: tokenResult.message });

    // 5. Vision
    updateStep('gemini', 'vision', { status: 'loading' });
    const visionResult = await runGeminiTests.vision(geminiApiKey);
    if (visionResult.success) updateStep('gemini', 'vision', { status: 'success', details: JSON.stringify(visionResult.data, null, 2) });
    else updateStep('gemini', 'vision', { status: 'error', details: visionResult.message });
  };

  // Run initial firebase test on mount if mode is firebase (default)
  useEffect(() => {
    if (mode === 'firebase') {
      runFirebaseTests();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSteps = mode === 'firebase' ? firebaseSteps : geminiSteps;
  const allSuccess = currentSteps.every(s => s.status === 'success');
  const hasError = currentSteps.some(s => s.status === 'error');
  const isLoading = currentSteps.some(s => s.status === 'loading');

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto">
        
        {/* Header with Tabs */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
              <button 
                onClick={() => setMode('firebase')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'firebase' ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Database size={18} />
                Firebase
              </button>
              <button 
                onClick={() => setMode('gemini')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'gemini' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Sparkles size={18} />
                Gemini AI
              </button>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900">
            {mode === 'firebase' ? 'Firebase Connection Test' : 'Gemini API Diagnostics'}
          </h1>
          <p className="text-slate-500 mt-2">
            {mode === 'firebase' 
              ? 'Herramienta de diagnóstico para verificar integración de Firebase SDK.' 
              : 'Suite de pruebas para validar conectividad y funciones de Gemini API.'}
          </p>
        </div>

        {/* Configuration Section */}
        <div className="mb-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-800 font-medium border-b border-slate-100"
          >
            <div className="flex items-center gap-2">
              {mode === 'firebase' ? <Code2 size={20} className="text-orange-500" /> : <KeyRound size={20} className="text-blue-500" />}
              {mode === 'firebase' ? 'Configuración Firebase (JSON)' : 'API Key de Gemini'}
            </div>
            {showConfig ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {showConfig && (
            <div className="p-4">
              {mode === 'firebase' ? (
                <>
                  <p className="text-sm text-slate-500 mb-2">
                    Pega tu objeto <code>firebaseConfig</code> aquí.
                  </p>
                  <textarea
                    value={firebaseConfigInput}
                    onChange={(e) => setFirebaseConfigInput(e.target.value)}
                    className="w-full h-48 p-4 font-mono text-xs md:text-sm bg-slate-900 text-green-400 rounded-lg border border-slate-300 outline-none resize-y"
                    spellCheck={false}
                  />
                  <div className="mt-2 text-right">
                     <button 
                       onClick={() => setFirebaseConfigInput(JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2))}
                       className="text-xs text-slate-400 hover:text-slate-600 underline"
                     >
                       Restaurar defecto
                     </button>
                  </div>
                </>
              ) : (
                <>
                   <p className="text-sm text-slate-500 mb-2">
                    Ingresa una API Key válida para ejecutar las pruebas.
                  </p>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full p-3 font-mono text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    La clave solo se usa localmente para las pruebas y no se guarda.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Status Banner */}
        <div className={`mb-8 p-4 rounded-xl border shadow-sm flex items-center gap-4 transition-colors duration-500 ${
          hasError 
            ? 'bg-red-50 border-red-100 text-red-800' 
            : allSuccess && !isLoading && stepsAreComplete(currentSteps)
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
              : 'bg-white border-slate-200 text-slate-600'
        }`}>
          {hasError ? (
            <div className="bg-red-100 p-2 rounded-full"><XCircle size={24} /></div>
          ) : allSuccess && !isLoading && stepsAreComplete(currentSteps) ? (
            <div className="bg-emerald-100 p-2 rounded-full"><ShieldCheck size={24} /></div>
          ) : (
             <div className="bg-slate-100 p-2 rounded-full"><Server size={24} className={isLoading ? "animate-pulse" : ""} /></div>
          )}
          
          <div>
            <h2 className="font-bold text-lg">
              {hasError ? 'Diagnóstico Fallido' : allSuccess && !isLoading && stepsAreComplete(currentSteps) ? 'Sistema Operativo' : 'Estado del Diagnóstico'}
            </h2>
            <p className="text-sm opacity-90">
              {hasError 
                ? 'Se encontraron problemas durante la ejecución.' 
                : allSuccess && !isLoading && stepsAreComplete(currentSteps)
                  ? 'Todas las pruebas pasaron exitosamente.' 
                  : 'Listo para iniciar pruebas.'}
            </p>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          {currentSteps.map((step) => (
            <StatusCard
              key={step.id}
              title={step.title}
              description={step.description}
              status={step.status}
              details={step.details}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={mode === 'firebase' ? runFirebaseTests : runGeminiTestFlow}
            disabled={isLoading}
            className={`flex items-center gap-2 px-6 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl ${
              mode === 'firebase' 
                ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {isLoading ? <Server size={18} className="animate-spin" /> : mode === 'firebase' ? <Database size={18} /> : <Bot size={18} />}
            {isLoading ? 'Ejecutando...' : 'Iniciar Diagnóstico'}
          </button>
        </div>

      </div>
    </div>
  );
};

// Helper to check if tests actually ran (not just initial idle state)
function stepsAreComplete(steps: TestStep[]) {
  return steps.every(s => s.status !== 'idle' && s.status !== 'loading');
}

export default App;

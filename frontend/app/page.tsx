"use client"; // tells Next.js we need browser interactivity

import { useState } from "react";

type Equation = "decay" | "lotka_volterra";
type Method = "rk4" | "euler";

interface SolverRequest {
  equation: Equation;
  method: Method;
  dt: number;
  t_end: number;
  y0: number[];
  k: number;
}

export default function Home() {
  // state management for inputs
  const [equation, setEquation] = useState<Equation>("decay");
  const [method, setMethod] = useState<Method>("euler");
  const [dt, setDt] = useState("0.1");
  const [tMax, setTMax] = useState("5");
  const [k, setK] = useState("0.1");
  const [y0String, setY0String] = useState("1.0"); // stored as string for text input
  const [error, setError] = useState<string | null>(null);

  const handleSolve = () => {
    // validation and submission engine
    setError(null); // reset error state on new attempts

    // parse y0 input
    const y0Array = y0String.split(",").map((num) => parseFloat(num.trim()));

    // check: were actual numbers entered for y0?
    if (y0Array.some((num) => Number.isNaN(num))) {
      setError("Invalid input for y0: please enter a comma-separated list of numbers (e.g., 0.9, 0.9)");
      return;
    }

    // check: were the right number if ICs provided?
    if (equation === "decay" && y0Array.length !== 1) {
      setError("Decay equation requires exactly one initial condition (e.g., 1.0)");
      return;
    }

    if (equation === "lotka_volterra" && y0Array.length !== 2) {
      setError("Lotka-Volterra equation requires exactly two initial conditions (e.g., 0.9, 0.9)");
      return;
    }
    
    const dtNum = parseFloat(dt);
    const tMaxNum = parseFloat(tMax);
    const kNum = parseFloat(k);
    // check: were dt, tMax, and k valid numbers?
    if (Number.isNaN(dtNum)) {
      setError("Invalid input for dt: please enter a valid number.");
      return;
    }

    if (Number.isNaN(tMaxNum)) {
      setError("Invalid input for tMax: please enter a valid number.");
      return;
    }

    if (Number.isNaN(kNum)) {
      setError("Invalid input for k: please enter a valid number.");
      return;
    }

    if (dtNum <= 0) {
      setError("dt must be greater than 0.");
      return;
    }

    if (tMaxNum <= 0) {
      setError("tMax must be greater than 0.");
      return;
    }

    if (kNum < 0) {
      setError("k must be non-negative.");
      return;
    }

    // if validation is passed, prepare the payload for submission
    const payload: SolverRequest = {
      equation,
      method,
      dt: dtNum,
      t_end: tMaxNum,
      y0: y0Array,
      k: kNum
    };

    console.log("Ready to send to FastAPI:", payload);
  };

return(
    <main className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ODE Solver</h1>
          <p className="text-slate-400 mt-2">Numerical methods for differential equations.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Equation Type</label>
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-sans"
                style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
                value={equation}
                onChange={(e) => {
                  setEquation(e.target.value as Equation);
                  setY0String(e.target.value === "decay" ? "1.0" : "0.9, 0.9");
                }}
              >
                <option value="decay">Decay</option>
                <option value="lotka_volterra">Lotka-Volterra</option>
              </select>
            </div>
          
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Method</label>
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-sans"
                style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
                value={method}
                onChange={(e) => setMethod(e.target.value as Method)}
              >
                <option value="euler">Euler's Method</option>
                <option value="rk4">Runge-Kutta 4th Order (RK4)</option>
              </select>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Initial Conditions (y0)</label>
              <input
                type="text"
                className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-sans"
                value={y0String}
                onChange={(e) => setY0String(e.target.value)}
                placeholder={equation === "decay" ? "1.0" : "0.9, 0.9"}
              />
            </div>

            {equation === "decay" && (
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Decay Constant (k)</label>
                <input
                  type="text"
                  className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-sans"
                  value={k}
                  onChange={(e) => setK(e.target.value)}
                  placeholder="0.1"
                />
              </div>
            )}

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Time Step (dt)</label>
              <input
                type="text"
                className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-sans"
                value={dt}
                onChange={(e) => setDt(e.target.value)}
                placeholder="0.1"
              />
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">End Time (tmax)</label>
              <input
                type="text"
                className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-sans"
                value={tMax}
                onChange={(e) => setTMax(e.target.value)}
                placeholder="5.0"
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleSolve}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Solve Equation
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl min-h-[400px] flex flex-col items-center justify-center">
          <p className="text-slate-400 text-lg">Graph will be displayed here</p>
        </div>

      </div>
    </main>
  );
}
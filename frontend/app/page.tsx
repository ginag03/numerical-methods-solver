"use client"; // tells Next.js we need browser interactivity

import { useState } from "react";
import dynamic from "next/dynamic";

// tell Next.js to only load plotly.js in the browser
const Plot = dynamic(() => import("react-plotly.js"), { ssr:false });

type Equation = "decay" | "lotka_volterra";
type Method = "rk4" | "euler";

interface SolverRequest {
  equation: Equation
  method: Method
  dt: number
  t_end: number
  y0: number[]
  k: number
  alpha: number
  beta: number
  delta: number
  gamma: number
}

// fraction parser for Lotka-Volterra parameters
const parseInput = (val: string): number => {
  const trimmed = val.trim();
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0]);
      const denominator = parseFloat(parts[1]);
      if (denominator === 0) {
        throw new Error("Denominator cannot be zero.");
      }
      return numerator / denominator;
    }
    return NaN; // invalid fraction format
  }
  return parseFloat(trimmed); // 
}

export default function Home() {
  // state management for inputs
  const [equation, setEquation] = useState<Equation>("decay");
  const [method, setMethod] = useState<Method>("euler");
  const [dt, setDt] = useState("");
  const [tMax, setTMax] = useState("");
  const [k, setK] = useState("");
  const [y0String, setY0String] = useState(""); // stored as string for text input
  const [error, setError] = useState<string | null>(null);

  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [alpha, setAlpha] = useState("");
  const [beta, setBeta] = useState("");
  const [delta, setDelta] = useState("");
  const [gamma, setGamma] = useState("");

  // if the user leaves the input blank, use parameters below
  const activeY0 = y0String.trim() === "" ? (equation === "decay" ? "1.0" : "0.9, 0.9") : y0String;
  const activeDt = dt.trim() === "" ? "0.1" : dt;
  const activeTMax = tMax.trim() === "" ? "5.0" : tMax;
  const activeK = k.trim() === "" ? "0.1" : k;
  const activeAlpha = alpha.trim() === "" ? "2/3" : alpha;
  const activeBeta = beta.trim() === "" ? "4/3" : beta;
  const activeDelta = delta.trim() === "" ? "1.0" : delta;
  const activeGamma = gamma.trim() === "" ? "1.0" : gamma;

  const handleSolve = async () => {
    // validation and submission engine
    setError(null); // reset error state on new attempts

    // reset the chart and loading state on new attempts
    setChartData(null);
    setIsLoading(true);

    // parse y0 input
    const y0Array = activeY0.split(",").map((num) => parseFloat(num.trim()));

    // check: were actual numbers entered for y0?
    if (y0Array.some((num) => Number.isNaN(num))) {
      setError("Invalid input for y0: please enter a comma-separated list of numbers (e.g., 0.9, 0.9)");
      setIsLoading(false);
      return;
    }

    // check: were the right number of ICs provided?
    if (equation === "decay" && y0Array.length !== 1) {
      setError("Decay equation requires exactly one initial condition (e.g., 1.0)");
      setIsLoading(false);
      return;
    }

    if (equation === "lotka_volterra" && y0Array.length !== 2) {
      setError("Lotka-Volterra equation requires exactly two initial conditions (e.g., 0.9, 0.9)");
      setIsLoading(false);
      return;
    }
    
    const dtNum = parseInput(activeDt);
    const tMaxNum = parseInput(activeTMax);
    const kNum = parseInput(activeK);
    const alphaNum = parseInput(activeAlpha);
    const betaNum = parseInput(activeBeta);
    const deltaNum = parseInput(activeDelta);
    const gammaNum = parseInput(activeGamma);

    // check: were dt, tMax, k, and LV parameters valid numbers?
    if (Number.isNaN(dtNum)) {
      setError("Invalid input for dt: please enter a valid number.");
      setIsLoading(false);
      return;
    }

    if (Number.isNaN(tMaxNum)) {
      setError("Invalid input for tMax: please enter a valid number.");
      setIsLoading(false);
      return;
    }

    if (equation === "decay" && Number.isNaN(kNum)) {
      setError("Invalid input for k: please enter a valid number.");
      setIsLoading(false);
      return;
    }

    if (dtNum <= 0) {
      setError("dt must be greater than 0.");
      setIsLoading(false);
      return;
    }

    if (tMaxNum <= 0) {
      setError("tMax must be greater than 0.");
      setIsLoading(false);
      return;
    }

    if (equation === "decay" && kNum < 0) {
      setError("k must be non-negative.");
      setIsLoading(false);
      return;
    }

    if (equation === "lotka_volterra" && Number.isNaN(alphaNum)) {
      setError("Invalid input for alpha: please enter a valid number.");
      setIsLoading(false);
      return;
    }

    if (equation === "lotka_volterra" && Number.isNaN(betaNum)) {
      setError("Invalid input for beta: please enter a valid number.");
      setIsLoading(false);
      return;
    }

    if (equation === "lotka_volterra" && Number.isNaN(deltaNum)) {
      setError("Invalid input for delta: please enter a valid number.");
      setIsLoading(false);
      return;
    }

    if (equation === "lotka_volterra" && Number.isNaN(gammaNum)) {
      setError("Invalid input for gamma: please enter a valid number.");
      setIsLoading(false);
      return;
    }

    // if validation is passed, prepare the payload for submission
    const payload: SolverRequest = {
      equation,
      method,
      dt: dtNum,
      t_end: tMaxNum,
      y0: y0Array,
      k: kNum,
      alpha: alphaNum,
      beta: betaNum,
      delta:deltaNum,
      gamma: gammaNum
    };

    try{
      // send the payload to FastAPI
      const response = await fetch("http://127.0.0.1:8000/solve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      // catch backend errors
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to solve the equation.")
      }

      // extract arrays and save them to React state for plotting
      const data = await response.json();
      setChartData(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occured whilst solving the equation. Please try again later.");
    } finally {
      // regardless of success or failure, turn off the loading state
      setIsLoading(false);
    }
  };

  // helper function to translate Python JSON to Plotly.js format
  const buildPlotlyData = () => {
    if (!chartData || !chartData.t_values || !chartData.y_values) return [];

    // slice down the Python matrix columns
    const t = chartData.t_values;
    const y0_column = chartData.y_values.map((row: number[]) => row[0]);

    // draw one line for decay
    if (equation === "decay") {
      return [
        {
          x: chartData.t_values,
          y: chartData.y_values.map((row: number[]) => row[0]),
          type: 'scatter',
          mode: 'lines',
          name: 'y(t)',
          line: { color: '#10B981', width: 3 } // Tailwind emerald-500
        }
      ];
    }

    // draw two lines for lotka-volterra
    if (equation === "lotka_volterra") {
      return [
        {
          x: chartData.t_values,
          y: chartData.y_values.map((row: number[]) => row[0]),
          type: 'scatter',
          mode: 'lines',
          name: 'Prey (x)',
          line: { color: '#10B981', width: 3 } // Tailwind emerald-500
        },
        {
          x: chartData.t_values,
          y: chartData.y_values.map((row: number[]) => row[1]),
          type: 'scatter',
          mode: 'lines',
          name: 'Predator (y)',
          line: { color: '#EF4444', width: 3 } // Tailwind red-500
        }
      ];
    }
    return [];
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
                autoComplete="off"
                onChange={(e) => {
                  setEquation(e.target.value as Equation);
                  setY0String("");
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
                autoComplete="off"
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

          {equation === "lotka_volterra" && (
            <>
              <div className="flex flex-col space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                <h3 className="pt-4 text-lg font-semibold text-white">Lotka-Volterra Parameters</h3>
                <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Alpha</label>
                <div className="flex items-center space-x-3">
                  <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.01"
                  className="w-full accent-emerald-500 cursor-pointer"
                  value={Number.isNaN(parseInput(activeAlpha)) ? 0 : parseInput(activeAlpha)}
                  onChange={(e) => setAlpha(e.target.value)}
                  />
                  <input
                  type="text"
                  className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-sans text-center text-sm"
                  value={alpha}
                  onChange={(e) => setAlpha(e.target.value)}
                  placeholder="2/3"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Beta</label>
                <div className="flex items-center space-x-3">
                  <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.01"
                  className="w-full accent-emerald-500 cursor-pointer"
                  value={Number.isNaN(parseInput(activeBeta)) ? 0 : parseInput(activeBeta)}
                  onChange={(e) => setBeta(e.target.value)}
                  />
                  <input
                  type="text"
                  className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-sans text-center text-sm"
                  value={beta}
                  onChange={(e) => setBeta(e.target.value)}
                  placeholder="4/3"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Delta</label>
                <div className="flex items-center space-x-3">
                  <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.01"
                  className="w-full accent-emerald-500 cursor-pointer"
                  value={Number.isNaN(parseInput(activeDelta)) ? 0 : parseInput(activeDelta)}
                  onChange={(e) => setDelta(e.target.value)}
                  />
                  <input
                  type="text"
                  className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-sans text-center text-sm"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  placeholder="1.0"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Gamma</label>
                <div className="flex items-center space-x-3">
                  <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.01"
                  className="w-full accent-emerald-500 cursor-pointer"
                  value={Number.isNaN(parseInput(activeGamma)) ? 0 : parseInput(activeGamma)}
                  onChange={(e) => setGamma(e.target.value)}
                  />
                  <input
                  type="text"
                  className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-sans text-center text-sm"
                  value={gamma}
                  onChange={(e) => setGamma(e.target.value)}
                  placeholder="1.0"
                  />  
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleSolve}
              disabled={isLoading}
              className={`bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors ${
                isLoading ? 'bg-slate-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isLoading ? "Solving..." : "Solve Equation"}
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl min-h-[400px] flex flex-col items-center justify-center">
          {isLoading && <p className="text-emerald-400 animate-pulse text-lg">Solving...</p>}

          {!isLoading && !chartData && (
            <p className="text-slate-400 text-lg">Graph will be displayed here</p>
          )}

          {!isLoading && chartData && (
            <div className="w-full h-[500px]">
              <Plot
                data={buildPlotlyData()}
                layout={{
                  autosize: true,
                  uirevision: activeTMax + activeDt + equation + method, // force reset when inputs change 
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#E5E7EB' }, // Tailwind slate-200
                  xaxis: {
                    title: 'Time (t)',
                    gridcolor: '#374151', // Tailwind slate-700
                    zerolinecolor: '#475569',
                    autorange: true
                  },
                  yaxis: {
                    title: 'y(t)',
                    gridcolor: '#374151', // Tailwind slate-700
                    zerolinecolor: '#475569',
                    autorange: true
                  },
                  margin: { t: 40, r: 20, b: 70, l: 70 },
                  legend: { orientation: "h", y: 1.1 }
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ responsive: true, displayModeBar: false }}
              />
            </div>
          )}
          
        </div>

      </div>
    </main>
  );
}
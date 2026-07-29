from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor
import numpy.typing as npt
from typing import Any, Dict, List, Optional, Protocol, Union
from solvers import TimeRange, SimpleEuler, RK4

# safe maths parser:

# define allowed numeric inputs and outputs for the safe function
NumericInput = Union[int, float, npt.NDArray[np.float64]]
NumericOutput = Union[float, npt.NDArray[np.float64]]

# protocol for the safe function type
class SafeFunction(Protocol):
    def __call__(self, *args: NumericInput) -> NumericOutput:
        ...

def create_safe_function(equation_string: str, variable_names: list[str]) -> Optional[SafeFunction]:
    """
    Safely convert string of maths to executablenumpy function using sympy
    """
    try:
        # whitelist for allowed symbols
        symbols: List[sp.Symbol] = [sp.Symbol(name) for name in variable_names]
        symbol_dict: Dict[str, sp.Symbol] = {name: symbols for name, symbols in zip(variable_names, symbols)}
        # also whitelist allowed functions
        function_whitelist: Dict[str, Any] = {
            'sin': sp.sin,
            'cos': sp.cos,
            'tan': sp.tan,
            'exp': sp.exp,
            'log': sp.log,
            'sqrt': sp.sqrt, # type: ignore
            'abs': sp.Abs,
            'pi': sp.pi
        }

        core_whitelist: Dict[str, Any] = {
            "Integer": sp.Integer,
            "Float": sp.Float,
            "Symbol": sp.Symbol,
            "Add": sp.Add,
            "Mul": sp.Mul,
            "Pow": sp.Pow,
        }

        allowed_globals: Dict[str, Any] =  {**symbol_dict, **function_whitelist, **core_whitelist}

        # allow users to type implicit multiplication (e.g., 2x instead of 2*x)
        transformations = standard_transformations + (implicit_multiplication_application, convert_xor)

        # parse the equation string into a sympy expression
        safe_expr: sp.Expr = parse_expr(
            equation_string,
            local_dict=allowed_globals,
            global_dict={}, # no global functions allowed
            transformations=transformations
        )
        print(f'Parsed expression: {safe_expr}')

        # translate sympy expression to a numpy function
        numpy_func = sp.lambdify(symbols, safe_expr, modules=['numpy'])

        return numpy_func

    except Exception as e:
        print(f'Error parsing equation: {e}')
        return None

# initialise FastAPI app
app = FastAPI(title='ODE Solver API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # frontend origin
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"], # allows POST, GET, PUT, etc
    allow_headers=["*"] # allows all headers
)

# define JSON structure expected from the frontend
class SolveRequest(BaseModel):
    equation: str
    y0: list[float]
    dt: float
    t_end: float
    method: str  # 'euler' or 'rk4'
    k: float = 1.0  # default value for k if not provided

    # Lotka-Volterra parameters
    alpha: float = 2.0/3.0
    beta: float = 4.0/3.0
    delta: float = 1.0
    gamma: float = 1.0

    # allow optional custom formula string
    custom_formula: Optional[str] = None

# ensuring return type is correct for the API
class SolveResponse(BaseModel):
    status: str
    method_used: str
    t_values: list[float]
    y_values: list[list[float]]

# endpoint 1: check the server is running
@app.get('/')
def read_root():
    return {"status": "online", "message": "ODE Solver API is running."}

# endpoint 2: trigger the ODE solver
@app.post('/solve', response_model=SolveResponse)
def solve_ode(request: SolveRequest) -> SolveResponse:
    eq_name = request.equation.lower()

    def decay_f(t: float, y: np.ndarray) -> np.ndarray:
        return -request.k * y # define ODE function dy/dt = -k * y

    def lv_f(t: float, Y: np.ndarray) -> np.ndarray:

        x, y = Y[0], Y[1]

        dx_dt = request.alpha * x -  request.beta * x * y
        dy_dt = request.delta * x * y - request.gamma * y

        return np.array([dx_dt, dy_dt])

    if eq_name == 'decay':
        f = decay_f
    elif eq_name == 'lotka_volterra':
        f = lv_f
    elif eq_name == 'custom':
        if not request.custom_formula:
            raise HTTPException(status_code=400, detail='Please input your own custom formula.')
        if len(request.y0) != 1:
            raise HTTPException(status_code=400, detail='1D ODEs require a single initial condition in y0.')

        # pass string to safe function parser, explicitly allowing only 't' and 'y' as variables
        safe_func = create_safe_function(request.custom_formula, ['t', 'y'])

        if safe_func is None:
            raise HTTPException(status_code=400, detail='Invalid custom formula. Please check your syntax and the allowed functions.')

        # define f so it unpacks y[0] for sympy and returns a 1d numpy array
        def custom_f(t: float, y: np.ndarray) -> np.ndarray:
            try:
                val = safe_func(t, y[0])
                return np.array([val], dtype=np.float64)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f'Error evaluating custom formula: {e}')

        f = custom_f
    else:
        raise HTTPException(status_code=400, detail='Equation must be either \'decay\', \'lotka_volterra\', or \'custom\'.')

    time_range = TimeRange(start=0.0, end=request.t_end)

    method_name = request.method.lower()
    if method_name == 'euler':
        solver = SimpleEuler(f=f, time_range=time_range, y0=np.array(request.y0))
    elif method_name == 'rk4':
        solver = RK4(f=f, time_range=time_range, y0=np.array(request.y0))
    else:
        raise HTTPException(status_code=400, detail='Method must be either \'euler\' or \'rk4\'.')
    
    t_numerical, y_numerical = solver.solve(dt=request.dt)

    return SolveResponse(
        status= 'success',
        method_used=method_name,
        t_values=t_numerical.tolist(),
        y_values=y_numerical.tolist()
    )
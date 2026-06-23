from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
from solvers import TimeRange, SimpleEuler, RK4

# initialise FastAPI app
app = FastAPI(title='ODE Solver API')

# define JSON structure expected from the frontend
class SolveRequest(BaseModel):
    equation: str
    y0: list[float]
    dt: float
    t_end: float
    method: str  # 'euler' or 'rk4'
    k: float = 1.0  # default value for k if not provided

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
        alpha = 2.0 / 3.0
        beta = 4.0 / 3.0
        delta = 1.0
        gamma = 1.0

        x, y = Y[0], Y[1]

        dx_dt = alpha * x -  beta * x * y
        dy_dt = delta * x * y - gamma * y

        return np.array([dx_dt, dy_dt])

    if eq_name == 'decay':
        f = decay_f
    elif eq_name == 'lotka_volterra':
        f = lv_f
    else:
        raise HTTPException(status_code=400, detail='Equation must be either \'decay\' or \'lotka_volterra\'.')

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
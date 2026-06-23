from fastapi import FastAPI
from pydantic import BaseModel

# initialise FastAPI app
app = FastAPI(title='ODE Solver API')

# define JSON structure expected from the frontend
class SolveRequest(BaseModel):
    k: float
    y0: float
    dt: float
    t_end: float
    method: str  # 'euler' or 'rk4'

# endpoint 1: check the server is running
@app.get('/')
def read_root():
    return {"status": "online", "message": "ODE Solver API is running."}

# endpoint 2: trigger the ODE solver
@app.post('/solve')
def solve_ode(request: SolveRequest):
    print(f'Received request to solve using method: {request.method} with dt = {request.dt}.')
    return {'status': 'success', 'message': f'successfully received parameters for {request.method} method.'}
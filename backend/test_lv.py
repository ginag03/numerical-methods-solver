import numpy as np
from safe_plotly import go
from solvers import TimeRange, RK4

def main():
    # define parameters
    alpha = 2.0 / 3.0
    beta = 4.0 / 3.0
    delta = 1.0
    gamma = 1.0

    # define system of ODEs
    def f(t: float, Y: np.ndarray):
        # Y is an array containing prey (x) and predators (y)
        x = Y[0]
        y = Y[1]

        dx_dt = alpha * x - beta * x * y
        dy_dt = delta * x * y - gamma * y

        return np.array([dx_dt, dy_dt])
    
    # set up ICs and time range
    Y0 = np.array([0.9, 0.9])
    t_range = TimeRange(start=0.0, end=15.0)
    dt = 0.5

    # initialise and run RK4 solver
    solver = RK4(f=f, time_range=t_range, y0=Y0)
    t_RK4, Y_RK4 = solver.solve(dt=dt)

    prey = Y_RK4[:, 0]
    predators = Y_RK4[:, 1]

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=t_RK4,
        y=prey,
        mode='lines+markers',
        name='Prey Population',
        line=dict(color='red', dash='dash', width=2),
        marker=dict(size=8)
    ))

    fig.add_trace(go.Scatter(
        x=t_RK4,
        y=predators,
        mode='lines+markers',
        name='Predator Population',
        line=dict(color='blue', dash='dot', width=2),
        marker=dict(symbol='square', size=8)
    ))

    fig.update_layout(
        title='Lotka-Volterra Predator-Prey Model Test',
        xaxis_title='Time (t)',
        yaxis_title='Population',
        plot_bgcolor='white',
        xaxis=dict(showline=True, linewidth=2, linecolor='black'),
        yaxis=dict(showline=True, linewidth=2, linecolor='black')
    )

    fig.show()

if __name__ == "__main__":
    main()
import numpy as np
from safe_plotly import go
from solvers import TimeRange, SimpleEuler, RK4

def main():
    # Define the test ODE system and parameters.
    k = 1.0

    def f(t: float, y: np.ndarray):

        return -k * y # the ODE dy/dt = -ky
    
    y0 = np.array([1.0])
    t_range = TimeRange(start=0.0, end=5.0)
    dt = 0.5

    # initialise and run the Simple Euler solver
    solver_euler = SimpleEuler(f=f, time_range=t_range, y0=y0)
    t_euler, y_euler = solver_euler.solve(dt=dt)

    # initialise and run the RK4 solver
    solver_RK4 = RK4(f=f, time_range=t_range, y0=y0)
    t_RK4, y_RK4 = solver_RK4.solve(dt=dt)

    # calculate exact solution
    t_exact = np.linspace(t_range.start, t_range.end, 100)
    y_exact = np.exp(-k * t_exact)

    fig = go.Figure()

    # add exact solution to figure
    fig.add_trace(go.Scatter(
        x=t_exact,
        y=y_exact,
        mode='lines',
        name='Analytical Solution',
        line=dict(color='black', width=2)
    ))

    # add Simple Euler numerical approximation to figure
    fig.add_trace(go.Scatter(
        x=t_euler,
        y=y_euler[:, 0],
        mode='lines+markers',
        name='Euler Approximate Solution',
        line=dict(color='red', dash='dash', width=2),
        marker=dict(size=8)
    ))

    # add RK4 numerical approximation to figure
    fig.add_trace(go.Scatter(
        x=t_RK4,
        y=y_RK4[:, 0],
        mode='lines+markers',
        name='RK4 Approximate Solution',
        line=dict(color='blue', dash='dot', width=2),
        marker=dict(symbol='square', size=8)
    ))

    fig.update_layout(
        title='Testing Numerical Methods',
        xaxis_title='Time (t)',
        yaxis_title='y(t)',
        plot_bgcolor='white',
        xaxis=dict(showline=True, linecolor='black', linewidth=2),
        yaxis=dict(showline=True, linecolor='black', linewidth=2)
    )

    fig.show()

if __name__ == '__main__':
    main()
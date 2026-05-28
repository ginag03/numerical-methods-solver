import numpy as np
import plotly.graph_objects as go
from solvers import TimeRange, SimpleEuler

def main():
    # Define the test ODE system and parameters.
    k = 1.0

    def f(t, y):

        return -k * y # the ODE dy/dt = -ky
    
    y0 = 1.0
    t_range = TimeRange(start=0.0, end=5.0)
    dt = 0.5

    # initialise and run the solver
    solver = SimpleEuler(f=f, time_range=t_range, y0=y0)
    t_approx, y_approx = solver.solve(dt=dt)

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

    # add numerical approximation to figure
    fig.add_trace(go.Scatter(
        x=t_approx,
        y=y_approx[:, 0],
        mode='lines+markers',
        name='Approximate Solution',
        line=dict(color='red', dash='dash', width=2),
        marker=dict(size=8)
    ))

    fig.update_layout(
        title='Testing Simple Euler Method',
        xaxis_title='Time (t)',
        yaxis_title='y(t)',
        plot_bgcolor='white',
        xaxis=dict(showline=True, linecolor='black', linewidth=2),
        yaxis=dict(showline=True, linecolor='black', linewidth=2)
    )

    fig.show()

if __name__ == '__main__':
    main()
import numpy as np
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass

@dataclass
class TimeRange:
    """
    Defines the integration bounds [start_time, end_time]
    """

    start: float
    end: float

class OdeSolver(ABC):
    """
    Abstract base class for solving IVPs of the form dy/dt = f(t, y)
    """

    def __init__(
        self, 
        f: Callable[[float, np.ndarray], np.ndarray], 
        time_range: TimeRange,
        y0: np.ndarray
    ):
        """
        Initialises the solver
        
        Parameters:
        - f: The function f(t, y)
        - time_range: The time range (start_time, end_time)
        - y0: The initial conditions
        """

        self.f = f
        self.time_range = time_range
        self.y0 = np.atleast_1d(y0)

    @abstractmethod
    def step(self, t: float, y: np.ndarray, dt: float) -> np.ndarray:
        """
        Calculates next value of y, must be implemented by child classes"""

        pass

    def solve(self, dt: float) -> tuple[np.ndarray, np.ndarray]:
        """
        Time step implementation
        """

        # discretisation grid
        t_values = np.arange(self.time_range.start, self.time_range.end + dt, dt)

        y_values = np.zeros((len(t_values), len(self.y0)))

        # IC
        y_values[0] = self.y0
        y_current = self.y0

        for i in range(1, len(t_values)):
            t_current = t_values[i - 1]
            y_current = self.step(t_current, y_current, dt)
            y_values[i] = y_current

        return t_values, y_values


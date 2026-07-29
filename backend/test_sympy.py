import numpy as np
import numpy.typing as npt
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor
from typing import Any, Dict, List, Optional, Protocol, Union

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
        allowed_globals: Dict[str, Any] =  {**symbol_dict, **function_whitelist}

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

# Test 1 - decay equation

eq1 = '-k * y'
variables1 = ['k', 'y']
f1 = create_safe_function(eq1, variables1)

if f1:
    # test with k = 0.1 and y = 5
    result1 = f1(0.1, 5)
    print(f'result of f1(0.1, 5): {result1}')

# Test 2 - multi variable and np arrays
eq2 = 'a * x + b * x * y'
variables2 = ['a', 'b', 'x', 'y']
f2 = create_safe_function(eq2, variables2)

if f2:
    # test with a = 2, b = 3 and bigger np arrays
    a = 2
    b = 3
    x = np.array([1, 2, 3])
    y = np.array([4, 5, 6])

    result2 = f2(a, b, x, y)
    print(f'result of f2(a, b, x, y): {result2}')

# Test 3 - hack attempt
eq3 = '__import__("os").system("echo You have been hacked!")'
variables3: List[str] = []
f3 = create_safe_function(eq3, variables3)

if f3:
    print('the hacker got in!!')


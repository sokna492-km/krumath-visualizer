# Krumath Visualizer

Krumath Interactive Math Visualizer

1. Project Context

I own and operate Krumath (krumath.com), an educational mathematics platform.

I want to build a new full-screen interactive mathematics visualization tool for teachers.

The working name is:

Krumath Visualizer

The purpose is to allow a teacher to stand in front of a class, open one page, choose a mathematics concept, and interactively demonstrate the concept on a large screen.

The tool should not feel like a traditional graphing calculator. It should feel like a teacher presentation and demonstration tool for mathematics.

The teacher should be able to:

create mathematical graphs

modify equations

drag points

adjust parameters with sliders

show/hide mathematical elements

animate concepts

add labels and annotations

demonstrate transformations

demonstrate geometry

demonstrate calculus

demonstrate statistics

demonstrate probability

save and reuse visualizations

reset a demonstration quickly

use the entire browser screen for classroom presentation

The application must be designed so that it can eventually cover a very broad range of school mathematics.

2. Main Product Goal

Build a highly flexible, responsive, teacher-friendly interactive mathematics canvas.

The key user experience should be:

Select a concept → get a ready-made visual → adjust parameters → explain the concept to students.

For example, if the teacher selects:

Linear Function

the application should immediately provide something like:

y = mx + c

m = 2
c = -3

with:

the line

x-axis

y-axis

grid

x-intercept

y-intercept

gradient

draggable points

gradient triangle

equation label

sliders for m and c

The teacher should be able to change m and c and immediately see the graph update.

The same philosophy should apply to other mathematical concepts.

3. Technology Requirements

Use a modern TypeScript web stack.

Preferred stack:

TypeScript

React

Vite or the existing Krumath framework

Tailwind CSS if already used by the project

JSXGraph for interactive mathematical visualization

Math.js for mathematical calculations and expression evaluation

MathLive for mathematical equation input

KaTeX for mathematical rendering where appropriate

Do NOT reinvent a mathematical graphing engine from scratch if an existing open-source library can provide the underlying functionality.

Use JSXGraph as the primary interactive mathematics rendering engine where appropriate.

Use Math.js for mathematical computation.

Use MathLive for equation editing/input.

Use the existing Krumath project's architecture, design system, authentication, routing and backend wherever possible.

Do not unnecessarily replace existing Krumath infrastructure.

4. Important Architecture Principle

Do NOT build this as one enormous component.

Create a reusable mathematical visualization architecture.

The system should have a concept of a Math Scene.

A Math Scene contains:

viewport

mathematical objects

parameters

controls

annotations

visibility settings

animation settings

theme/settings

Conceptually:

type MathScene = {
  id: string;
  title: string;
  category: string;

  viewport: {
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
  };

  objects: MathObject[];

  parameters: Parameter[];

  annotations: Annotation[];

  settings: SceneSettings;
};

Use a flexible object model.

For example:

type MathObject =
  | FunctionObject
  | PointObject
  | LineObject
  | SegmentObject
  | RayObject
  | CircleObject
  | ArcObject
  | PolygonObject
  | VectorObject
  | InequalityObject
  | ParametricCurveObject
  | PolarCurveObject
  | TextObject
  | ImageObject
  | RegionObject;

The exact implementation can be improved based on the chosen libraries.

The architecture must allow new mathematical concepts to be added later without rewriting the entire application.

5. Full-Screen Teacher Interface

The visualizer should have a dedicated full-screen presentation experience.

Target use case:

A teacher connects a laptop to:

classroom projector

interactive whiteboard

large TV

external display

The application should work well at:

1280×720

1366×768

1920×1080

2560×1440

3840×2160

The graph/canvas should use most of the available screen.

Avoid unnecessary UI.

The interface should be clean, modern and suitable for classroom use.

6. Proposed Layout

Use a layout similar to:

┌───────────────────────────────────────────────────────────────┐
│ KRUMATH   Math Visualizer                    Save  Reset  ⛶  │
├───────────────┬───────────────────────────────────────────────┤
│               │                                               │
│   CONCEPTS    │                                               │
│               │                                               │
│ Functions     │                                               │
│ Geometry      │                                               │
│ Trigonometry  │                                               │
│ Vectors       │                 INTERACTIVE                   │
│ Calculus      │                    GRAPH                      │
│ Statistics    │                                               │
│ Probability   │                       y                       │
│ Sequences     │                       ↑                       │
│ Transform.    │                    ╱                          │
│               │                 ╱                             │
│               │              ●                                │
│               │──────────────┼────────────────────→ x        │
│               │                                               │
├───────────────┴───────────────────────────────────────────────┤
│ Equation / Parameters / Controls                               │
└───────────────────────────────────────────────────────────────┘

However, do not blindly follow this layout.

Make the interface responsive and ergonomic.

The graph should receive the majority of the screen.

The controls should not obscure the mathematical visualization.

7. Main Navigation Categories

Create the following categories.

Functions

Include:

Linear

Quadratic

Cubic

Polynomial

Absolute Value

Reciprocal

Square Root

Exponential

Logarithmic

Power

Piecewise

Parametric

Polar

Implicit

Coordinate Geometry

Include:

Points

Distance

Midpoint

Gradient

Equation of a line

Parallel lines

Perpendicular lines

Intersections

Loci

Geometry

Include:

Angles

Triangles

Quadrilaterals

Polygons

Circles

Arcs

Tangents

Chords

Perpendicular bisectors

Angle bisectors

Parallel lines

Similar shapes

Congruent shapes

Transformations

Include:

Translation

Reflection

Rotation

Enlargement

Combined transformations

Vectors

Include:

Vector representation

Magnitude

Direction

Vector addition

Vector subtraction

Scalar multiplication

Resultant vectors

Position vectors

Dot product

Projection where appropriate

Trigonometry

Include:

Sine

Cosine

Tangent

Unit circle

Sine rule

Cosine rule

Trigonometric graphs

Amplitude

Period

Phase shift

Vertical shift

Calculus

Include:

Functions

Limits

Tangent

Secant

Gradient

Derivative

Second derivative

Stationary points

Maximum

Minimum

Inflection point

Integration

Area under curve

Area between curves

Riemann sums

Inequalities

Include:

Linear inequalities

Quadratic inequalities

Simultaneous inequalities

Regions

Shaded regions

Boundary lines

Strict vs inclusive inequalities

Sequences and Series

Include:

Arithmetic sequences

Geometric sequences

Recursive sequences

nth term

Partial sums

Infinite geometric series where appropriate

Statistics

Include:

Mean

Median

Mode

Range

Quartiles

Interquartile range

Box plot

Histogram

Frequency polygon

Scatter plot

Correlation

Line of best fit

Regression

Probability

Include:

Probability scale

Sample spaces

Tree diagrams

Experimental probability

Simulations

Binomial distribution

Normal distribution where appropriate

8. Function Visualizer

The function visualizer is one of the most important parts.

The teacher should be able to enter expressions such as:

y = 2x + 3
y = x²
y = a(x-h)² + k
y = sin(x)
y = a sin(bx+c)+d
y = 1/x
y = eˣ
y = log(x)

The application should parse and visualize them.

Allow the teacher to add multiple functions.

For example:

f(x) = x²
g(x) = 2x + 1
h(x) = -x + 4

Each function should be independently controllable.

Allow:

show/hide

edit

delete

rename

change line style

show equation

show important points

show intersections

show roots

Do not rely only on color to distinguish functions because of accessibility.

9. Parameter Sliders

A major feature should be dynamic parameters.

For:

y = a(x-h)² + k

automatically expose:

a
h
k

as interactive sliders.

Example:

a     [-5 ─────●───── 5]
h     [-10 ────●───── 10]
k     [-10 ────●───── 10]

Changing a parameter must update the graph immediately.

Allow teachers to customize:

minimum

maximum

step

initial value

label

Parameters should support numbers, angles and other appropriate values.

10. Mathematical Annotations

Teachers must be able to add explanatory elements.

Examples:

text labels

coordinate labels

arrows

points

lines

shaded regions

measurement labels

angle labels

equation labels

custom notes

Example:

Gradient = 2
y-intercept = 3

These annotations should be movable where appropriate.

11. Draggable Mathematical Objects

Objects should be interactively draggable where mathematically meaningful.

For example:

A point:

A = (2, 3)

can be dragged.

A line defined through two points should update when the points move.

A circle defined by center and radius should update when the center/radius changes.

A triangle should allow vertices to be moved.

Constraints should be supported where practical.

For example:

point constrained to a line

point constrained to a circle

horizontal line

vertical line

parallel line

perpendicular line

12. Animation

Include an animation system.

Teachers should be able to animate mathematical concepts.

Examples:

moving point along a graph

tangent moving along a curve

transformation animation

sine wave phase movement

changing parameter values

Riemann rectangles increasing

probability simulations

Controls:

▶ Play
⏸ Pause
↻ Reset
Speed: 0.5x / 1x / 2x

Where appropriate, allow:

play

pause

reverse

loop

speed

animation range

13. Calculus Demonstrations

Build strong visual demonstrations.

For:

f(x) = x²

allow the teacher to activate:

Tangent
Secant
Derivative
Second derivative
Stationary point
Area

For a movable point x = a, show:

x = 2
f(x) = 4
f'(x) = 4

Display a tangent line.

Allow the teacher to drag a along the graph.

For integration:

Show:

Area under f(x)

and allow the teacher to adjust the lower and upper bounds.

For Riemann sums:

n = 5

and allow:

n = 10
n = 20
n = 50
n = 100

with the rectangles visually updating.

14. Geometry Demonstrations

Create an interactive geometry mode.

The teacher should be able to construct:

Point
Line
Segment
Ray
Circle
Arc
Triangle
Polygon
Angle

and mathematical relationships:

Parallel
Perpendicular
Equal length
Equal angle
Bisector
Tangent
Midpoint

Show measurements dynamically.

For example:

AB = 5.24 cm
∠ABC = 60°
Area = 12.4 cm²

When objects move, measurements update automatically.

15. Transformation Demonstrations

Allow teachers to create an original object and transform it.

Example:

Original triangle
        ↓
Translation
        ↓
Translated triangle

Controls:

dx = 3
dy = 2

or:

Rotation
Centre = (0,0)
Angle = 90°

or:

Enlargement
Centre = (0,0)
Scale factor = 2

Show original and transformed objects simultaneously.

Provide optional animation between states.

16. Trigonometric Graphs

For:

y = a sin(bx + c) + d

automatically expose:

Amplitude
Period
Phase shift
Vertical shift

Display the important characteristics.

For example:

Amplitude = 2
Period = 360°
Phase shift = 30°
Vertical shift = 1

Include a unit-circle mode where appropriate.

The graph should support degree/radian modes.

17. Inequality Visualization

Support expressions such as:

y > 2x + 1
y ≤ x²
x² + y² < 25

Automatically shade the appropriate region.

Correctly distinguish:

<

≤

>

≥

Use solid/dashed boundaries appropriately.

Allow multiple inequalities to create intersections of regions.

18. Statistics Visualizer

Create a data-driven visualization mode.

Allow teachers to manually enter data.

Example:

12
15
17
18
21
22
25

Automatically calculate and visualize:

mean

median

mode

range

quartiles

IQR

Allow teachers to switch between:

dot plot

histogram

box plot

For scatter plots, allow:

x values
y values

and calculate:

correlation

regression line

equation of regression line

19. Probability Simulation

Create interactive simulations.

Examples:

coin toss

dice

spinner

random number generator

sampling

Allow the teacher to set:

Number of trials = 1000

Then animate the experiment.

Display:

Experimental probability
Theoretical probability

and demonstrate convergence where appropriate.

20. Coordinate System Controls

Teachers must have control over the coordinate plane.

Allow:

show/hide grid

show/hide axes

show/hide labels

show/hide origin

major grid spacing

minor grid spacing

x-axis range

y-axis range

equal aspect ratio

automatic viewport

zoom

pan

Include a quick reset button.

21. Presentation Mode

Create a dedicated presentation mode.

When activated:

hide unnecessary UI

maximize the graph

increase text/label size

increase touch target sizes

make controls easy to operate

provide minimal toolbar

The teacher should be able to enter browser fullscreen.

Provide:

Presentation Mode

and:

Exit Presentation

Keyboard shortcuts should work.

Suggested shortcuts:

F = fullscreen
R = reset
Space = play/pause
Esc = exit fullscreen

Avoid conflicts with browser/system shortcuts.

22. Touch Support

The application should work with:

mouse

trackpad

touchscreen

interactive whiteboard

Support:

drag

pinch zoom where possible

pan

touch-friendly sliders

large controls

Do not make the application dependent on hover.

23. Responsive Design

Desktop classroom presentation is the primary use case.

But it should also work on:

laptops

tablets

smaller screens

On mobile, the UI can change to a stacked layout.

Do not sacrifice desktop classroom usability just to make everything fit on mobile.

24. Accessibility

Follow accessibility best practices.

Requirements:

keyboard navigation

visible focus states

sufficient contrast

labels for controls

accessible buttons

no information conveyed only through color

readable font sizes

support screen readers where practical

support reduced-motion preferences

Mathematical content should remain readable.

25. Saving and Loading Scenes

Allow teachers to save a visualization.

Example:

My Linear Function Lesson

Save:

equations

parameters

viewport

annotations

objects

visibility settings

animation state/settings

selected concept

Allow:

Save
Save As
Duplicate
Open
Reset

Initially local storage can be used if appropriate.

Design the data model so cloud persistence can be added later.

26. Sharing

Design for future sharing.

A scene should eventually be representable as a URL:

krumath.com/visualizer/abc123

A teacher could send this to students.

Do not necessarily implement full sharing in the first version, but design the scene serialization format so this is possible.

27. Export

Where technically practical, support:

PNG

SVG

printable view

This is useful for teachers preparing worksheets and presentations.

Do not make exporting the highest priority in the first version.

28. Concept Templates

The most important usability feature is a library of ready-made templates.

Examples:

Linear Function

Default:

y = 2x + 1

Controls:

Gradient
Intercept

Quadratic Transformation

Default:

y = a(x-h)²+k

Controls:

a
h
k

Circle

Default:

(x-h)² + (y-k)² = r²

Controls:

h
k
r

Sine Transformation

y = a sin(bx+c)+d

Controls:

a
b
c
d

Differentiation

f(x) = x²

Movable tangent.

Integration

f(x) = x²

Movable lower/upper bounds.

Vector Addition

a + b

with draggable vectors.

Reflection

Original object + mirror line + transformed object.

The template system should be extensible.

29. Teacher-Friendly Presets

Each concept should have a sensible default example.

Do not show a blank canvas when the teacher selects a concept.

For example:

Selecting:

Quadratic

should immediately show:

y = x²

Selecting:

Gradient

should immediately show:

A = (-2,-1)
B = (2,3)

with the gradient demonstrated visually.

Selecting:

Circle

should immediately show:

x² + y² = 25

with center and radius visible.

The teacher can then customize it.

30. Expression Input

Use a proper mathematical input interface.

Prefer MathLive or an equivalent math editor.

The teacher should be able to enter:

y = x² + 2x - 3

rather than requiring programming syntax.

Support common mathematical notation:

x²
√x
sin(x)
cos(x)
tan(x)
log(x)
eˣ
|x|

Handle parsing safely.

Never execute arbitrary JavaScript from user-entered expressions.

31. Security

User mathematical expressions must never be executed as arbitrary JavaScript.

Use a safe mathematical parser.

Validate:

expressions

parameter names

numeric ranges

serialized scenes

Do not use eval().

Prevent malformed scene data from breaking the application.

32. Performance

The graph must feel immediate.

Target:

smooth dragging

smooth slider updates

responsive zoom/pan

no noticeable delay for normal school-level mathematics

Optimize expensive calculations.

If necessary, use Web Workers for computationally expensive operations.

Do not prematurely over-engineer.

33. Visual Design

The design should feel like a modern education product.

Avoid making it look like an engineering CAD application.

Prioritize:

clean

minimal

readable

professional

classroom friendly

The graph should visually dominate the screen.

Controls should be secondary.

Use subtle panels and clear hierarchy.

Avoid excessive animations.

34. Krumath Branding

Use Krumath branding naturally.

The visualizer should clearly belong to Krumath.

However, do not make the branding consume significant screen space during classroom presentation.

Example:

KRUMATH
Math Visualizer

Use the existing Krumath design system if one exists.

Do not introduce a completely unrelated visual identity.

35. Architecture for Future Expansion

Design the system as a plugin/template architecture.

A future concept should ideally be addable through something similar to:

registerConcept({
  id: "quadratic",
  category: "functions",
  title: "Quadratic",
  createScene: createQuadraticScene,
  controls: [...]
});

The exact implementation is up to you.

The important requirement is that adding a new concept should not require modifying unrelated core components.

36. Suggested Folder Structure

Use something conceptually similar to:

src/
  features/
    visualizer/
      components/
      engine/
      scenes/
      concepts/
      controls/
      annotations/
      animations/
      serialization/
      templates/
      hooks/
      types/

  math/
    parser/
    functions/
    geometry/
    calculus/
    statistics/
    probability/

  components/
    ui/

  pages/
    visualizer/

Adapt this to the existing Krumath project architecture.

Do not create duplicate infrastructure that already exists in the project.

37. Development Approach

Do NOT attempt to implement every mathematical concept in the first build.

Build a strong foundation first.

Phase 1 should contain:

Full-screen visualizer

Coordinate plane

Function plotting

Mathematical expression input

Multiple functions

Parameter sliders

Draggable points

Labels

Annotations

Pan/zoom

Reset

Save/load locally

Presentation mode

Responsive UI

Then implement the concept system.

First concepts:

Linear functions

Quadratic functions

Gradient

Intercepts

Simultaneous equations

Inequalities

Circle

Transformations

Vectors

Trigonometric graphs

Tangent/derivative

Area/integration

After the architecture is proven, expand into statistics and probability.

38. Example User Flow

A teacher opens:

krumath.com/visualizer

They see:

What do you want to demonstrate?

Functions
Geometry
Vectors
Trigonometry
Calculus
Statistics
Probability

They click:

Functions → Quadratic

The system displays:

y = x²

with a beautiful coordinate plane.

The teacher turns on:

Transformation

The system changes the equation interface to:

y = a(x-h)²+k

Sliders appear:

a
h
k

The teacher moves a.

The graph immediately changes.

The teacher then enables:

Show vertex
Show axis of symmetry
Show roots

The relevant information appears on the graph.

The teacher can then enter presentation mode and explain the concept.

This workflow should feel fast and obvious.

39. Do Not Build These Things

Avoid unnecessary complexity in the first version.

Do not initially build:

a complete LMS

student accounts

complicated collaboration

real-time multiplayer

AI tutoring

complicated lesson authoring

advanced 3D mathematics

a custom mathematical rendering engine

unnecessary backend infrastructure

The first objective is:

Make the interactive mathematical visualization experience excellent.

40. Testing

Create automated tests for:

mathematical expression parsing

parameter updates

scene serialization

scene loading

coordinate calculations

geometry calculations

transformations

derivative calculations

inequality parsing

invalid expressions

responsive UI behavior

Also manually test:

mouse

touch

keyboard

fullscreen

projector-sized display

1080p

4K

Test with long equations and large/small coordinate ranges.

41. Important Mathematical Correctness Requirement

Mathematical correctness is more important than visual effects.

Do not display:

incorrect gradients

incorrect intercepts

incorrect transformations

incorrect derivative values

incorrect areas

incorrect geometric measurements

Use established mathematical libraries where possible.

Clearly distinguish:

exact values

numerical approximations

displayed rounded values

For example:

π ≈ 3.14159

should not silently imply that the displayed value is exact.

42. Error Handling

If a teacher enters an invalid expression:

y = sin(

do not crash.

Show a small, understandable message:

Please check the equation.

If a function is undefined for part of the visible range, render it correctly rather than producing misleading lines.

For example:

y = 1/x

must not draw a line through the discontinuity.

43. User Experience Principle

The application should follow one major principle:

The teacher should spend time teaching mathematics, not operating software.

Every common classroom action should require very few clicks.

The teacher should be able to:

choose concept

change parameter

demonstrate

reset

quickly.

Do not overload the interface with advanced settings by default.

Put advanced configuration behind an optional settings panel.

44. Deliverables

Implement the feature in the existing Krumath project.

Deliver:

Working full-screen Math Visualizer

Reusable visualization engine

Concept/template architecture

Function graphing

Mathematical expression input

Parameter sliders

Interactive points and objects

Annotations

Pan/zoom

Presentation mode

Save/load

Initial concept library

Responsive design

Accessibility support

Tests

Clear code documentation

45. Development Instructions

Before coding:

Inspect the existing Krumath codebase.

Identify the current framework.

Identify the existing UI component library.

Identify the existing styling system.

Identify the routing structure.

Identify authentication requirements.

Identify reusable components.

Do not replace existing infrastructure unnecessarily.

Determine the cleanest location for the visualizer feature.

Check package versions and compatibility.

Then propose the architecture briefly.

After that, implement the feature.

Do not stop at a mockup.

Build a functioning implementation.

46. Code Quality

Write production-quality code.

Requirements:

TypeScript

strong typing

reusable components

small focused components

clear naming

no unnecessary duplication

no any unless genuinely necessary

no eval

no unsafe expression execution

proper error handling

clean state management

comments only where they explain non-obvious mathematical or architectural decisions

Do not create one huge component containing the entire visualizer.

47. Open-Source and Licensing

Prefer open-source libraries with licenses compatible with a commercial educational platform.

Before adding a dependency, verify its license.

Do not introduce a library with restrictive licensing without explicitly flagging it.

Preferred mathematical visualization foundation:

JSXGraph

Preferred mathematical computation:

Math.js

Preferred mathematical input:

MathLive

Preferred mathematical rendering:

KaTeX

If an alternative is technically superior, explain why before replacing these choices.

48. Final Quality Standard

The finished product should feel closer to:

“A digital interactive whiteboard for mathematics”

than:

“A graphing calculator.”

A teacher should be able to open it during a lesson and immediately demonstrate a mathematical idea visually.

The system must be extensible enough that Krumath can eventually support a comprehensive library of interactive demonstrations covering school mathematics from basic coordinate geometry through functions, algebra, geometry, trigonometry, vectors, calculus, statistics and probability.

The mathematical visualization engine, UI and concept architecture must therefore be designed for long-term expansion.

Start with the core engine and the first high-quality concepts, but build the architecture so that the rest can be added without major rewrites.

Start Now

First inspect the existing Krumath project.

Then:

Identify the current technology stack.

Identify the existing design system.

Identify the best integration point.

Propose the architecture.

Install only necessary dependencies.

Build the visualizer foundation.

Build the first interactive concepts.

Test thoroughly.

Fix issues.

Polish the teacher experience.

Do not merely describe what could be built.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ca37c3c2-e9fa-419f-88d7-deedf7878578).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

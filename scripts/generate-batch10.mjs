#!/usr/bin/env node
// Batch 10 generator — 100 original GMAT Focus questions, hardcoded here and
// emitted as content JSON. Distribution:
//   32 PS  (qd-quant-01..32)   -> content/questions/quant-10.json
//   14 CR  (qd-cr-01..14)      -> content/questions/verbal-10.json
//   12 RC  (3 passages x 4)    -> verbal-10.json + content/question_groups-7.json
//   16 DS  (qd-ds-01..16)      -> content/questions/data_insights-10.json
//    8 GI  (qd-gi-01..08)      -> data_insights-10.json
//   10 TA  (qd-ta-01..10)      -> data_insights-10.json
//    8 TP  (qd-tp-01..08)      -> data_insights-10.json
//
// LaTeX uses single backslashes in these JS string literals (\frac, \div, ...);
// JSON.stringify re-escapes them to the double backslashes the bank expects.
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pad = (n) => String(n).padStart(2, '0');
const ABC = (arr) => arr.map((text, i) => ({ key: 'ABCDE'[i], text: String(text) }));
const R = (arr) => arr.map((text, i) => ({ key: 'r' + (i + 1), text: String(text) }));

// ── Builders ────────────────────────────────────────────────────────────────
function ps(n, [topic, difficulty, stem, ch, ans, explanation, t = 90]) {
  return {
    id: `qd-quant-${pad(n)}`, section: 'quant', type: 'problem_solving',
    topic, difficulty, orderIndex: 0, stem, assets: {},
    choices: ABC(ch), correctAnswer: { format: 'single', value: ans },
    explanation, estimatedTimeSeconds: t,
  };
}
function ds(n, [topic, difficulty, stem, ans, explanation, t = 110]) {
  return {
    id: `qd-ds-${pad(n)}`, section: 'data_insights', type: 'data_sufficiency',
    topic, difficulty, orderIndex: 0, stem, assets: {},
    correctAnswer: { format: 'single', value: ans },
    explanation, estimatedTimeSeconds: t,
  };
}
function cr(n, [topic, difficulty, stem, ch, ans, explanation, t = 105]) {
  return {
    id: `qd-cr-${pad(n)}`, section: 'verbal', type: 'critical_reasoning',
    topic, difficulty, orderIndex: 0, stem, assets: {},
    choices: ABC(ch), correctAnswer: { format: 'single', value: ans },
    explanation, estimatedTimeSeconds: t,
  };
}
function rcq(groupId, order, suffix, [topic, difficulty, stem, ch, ans, explanation, t = 105]) {
  return {
    id: `qd-rc-${groupId.replace('rc-', '')}-${suffix}`, section: 'verbal',
    type: 'reading_comprehension', topic, difficulty, groupId, orderIndex: order,
    stem, assets: {}, choices: ABC(ch),
    correctAnswer: { format: 'single', value: ans }, explanation, estimatedTimeSeconds: t,
  };
}
function gi(n, { topic, difficulty = 'medium', chart, dropdowns, value, explanation, t = 120 }) {
  return {
    id: `qd-gi-${pad(n)}`, section: 'data_insights', type: 'graphics_interpretation',
    topic, difficulty, orderIndex: 0, stem: 'Use the chart to answer the dropdown statements.',
    assets: { chart, dropdowns }, correctAnswer: { format: 'dropdowns', value },
    explanation, estimatedTimeSeconds: t,
  };
}
function ta(n, { topic, difficulty = 'medium', caption, columns, rows, statements, value, explanation, t = 130 }) {
  return {
    id: `qd-ta-${pad(n)}`, section: 'data_insights', type: 'table_analysis',
    topic, difficulty, orderIndex: 0, stem: 'Use the table to evaluate each statement.',
    assets: { table: { sortable: true, caption, columns, rows }, dichotomous: { labels: ['True', 'False'] } },
    choices: statements, correctAnswer: { format: 'dichotomous', value },
    explanation, estimatedTimeSeconds: t,
  };
}
function tp(n, { topic, difficulty = 'medium', exprA, exprB, choices, value, explanation, t = 110 }) {
  return {
    id: `qd-tp-${pad(n)}`, section: 'data_insights', type: 'two_part_analysis',
    topic, difficulty, orderIndex: 0,
    stem: `Evaluate each expression using the shared options.\n\nPart A: What is the value of ${exprA}?\n\nPart B: What is the value of ${exprB}?`,
    assets: { twoPart: { columns: [{ key: 'partA', label: `Value of ${exprA}` }, { key: 'partB', label: `Value of ${exprB}` }] } },
    choices: R(choices), correctAnswer: { format: 'two_part', value },
    explanation, estimatedTimeSeconds: t,
  };
}

// ── Problem Solving (32) ──────────────────────────────────────────────────────
const PS = [
  ['percents', 'easy', 'A company had $250$ employees. If $30\\%$ left during the year, how many employees remained?', ['150', '165', '175', '185', '200'], 'C', '$30\\%$ of $250$ is $75$, so $250-75=175$ employees remained.', 60],
  ['ratios', 'easy', 'A sum of $84$ dollars is divided between two people in the ratio $3:4$. How many dollars does the person with the larger share receive?', ['36', '42', '48', '54', '60'], 'C', 'There are $3+4=7$ parts. The larger share is $\\frac{4}{7}\\times 84 = 48$.', 75],
  ['statistics', 'easy', 'The average (arithmetic mean) of five numbers is $22$. Four of them are $18$, $20$, $25$, and $19$. What is the fifth number?', ['24', '26', '28', '30', '32'], 'C', 'The sum of all five is $5\\times 22 = 110$. The four known values sum to $82$, so the fifth is $110-82=28$.', 90],
  ['algebra', 'easy', 'If $4x - 9 = 27$, what is the value of $x$?', ['6', '7', '8', '9', '10'], 'D', '$4x-9=27 \\Rightarrow 4x=36 \\Rightarrow x=9$.', 60],
  ['number properties', 'easy', 'What is the remainder when $67$ is divided by $9$?', ['2', '3', '4', '5', '7'], 'C', '$67 = 7\\times 9 + 4$, so the remainder is $4$.', 60],
  ['arithmetic', 'easy', 'A theater has $13$ rows with $7$ seats in each row. How many seats are there in total?', ['84', '88', '91', '96', '98'], 'C', '$13\\times 7 = 91$ seats.', 60],
  ['geometry', 'medium', 'In the coordinate plane, what is the distance between the points $(1, 2)$ and $(7, 10)$?', ['8', '9', '10', '12', '14'], 'C', 'Distance $=\\sqrt{(7-1)^2+(10-2)^2}=\\sqrt{36+64}=\\sqrt{100}=10$.', 90],
  ['rates', 'medium', 'Pipe A fills a tank in $6$ hours and pipe B fills the same tank in $9$ hours. Working together, how many hours do they take to fill it? (Express as a decimal.)', ['2.5', '3.0', '3.6', '4.2', '5.0'], 'C', 'Their combined rate is $\\frac{1}{6}+\\frac{1}{9}=\\frac{5}{18}$ tank per hour, so the time is $\\frac{18}{5}=3.6$ hours.', 120],
  ['mixtures', 'medium', 'A $5$-liter solution is $20\\%$ acid. How many liters of water must be added to dilute it to $10\\%$ acid?', ['2', '3', '4', '5', '6'], 'D', 'The acid is $20\\%$ of $5 = 1$ liter. A $10\\%$ solution needs a total of $\\frac{1}{0.10}=10$ liters, so add $10-5=5$ liters of water.', 120],
  ['exponents', 'easy', 'What is the value of $3^2 \\times 3^4$?', ['81', '243', '486', '729', '2187'], 'D', '$3^2\\times 3^4 = 3^{6} = 729$.', 60],
  ['inequalities', 'medium', 'How many integers $x$ satisfy $-3 < 2x - 1 \\le 5$?', ['3', '4', '5', '6', '7'], 'B', '$-3<2x-1\\le 5 \\Rightarrow -1<x\\le 3$. The integers are $0,1,2,3$ — four values.', 90],
  ['statistics', 'easy', 'What is the median of the list $5$, $9$, $9$, $12$, $14$?', ['8', '9', '11', '12', '14'], 'B', 'The list is already ordered, and the middle (third) value is $9$.', 60],
  ['sequences', 'medium', 'In an arithmetic sequence the first term is $5$ and the common difference is $4$. What is the $10$th term?', ['37', '39', '41', '45', '49'], 'C', '$a_{10}=5+(10-1)\\times 4 = 5+36 = 41$.', 75],
  ['probability', 'easy', 'Two fair coins are tossed. What is the probability of getting exactly one head?', ['1/4', '1/3', '1/2', '2/3', '3/4'], 'C', 'The outcomes are HH, HT, TH, TT. Exactly one head occurs in $2$ of $4$ cases, so the probability is $\\frac{1}{2}$.', 75],
  ['combinatorics', 'medium', 'In how many ways can a president and a vice president be chosen from a group of $5$ people (one person cannot hold both posts)?', ['10', '15', '20', '25', '120'], 'C', 'There are $5$ choices for president and $4$ for vice president: $5\\times 4 = 20$.', 90],
  ['fractions', 'easy', 'What is $\\frac{2}{5}$ of $60$?', ['20', '22', '24', '28', '30'], 'C', '$\\frac{2}{5}\\times 60 = 24$.', 60],
  ['rates', 'easy', 'A car travels $180$ kilometers in $3$ hours at a constant speed. At that speed, how far does it travel in $5$ hours?', ['240', '260', '280', '300', '320'], 'D', 'The speed is $\\frac{180}{3}=60$ km/h, so in $5$ hours it travels $60\\times 5 = 300$ km.', 75],
  ['number properties', 'medium', 'How many positive divisors does $60$ have?', ['8', '10', '12', '14', '16'], 'C', '$60 = 2^2\\times 3\\times 5$, so the number of divisors is $(2+1)(1+1)(1+1)=12$.', 90],
  ['algebra', 'easy', 'If $x + y = 15$ and $x - y = 3$, what is the value of $x$?', ['6', '7', '8', '9', '12'], 'D', 'Adding the two equations gives $2x=18$, so $x=9$.', 75],
  ['geometry', 'easy', 'What is the slope of the line through the points $(2, 3)$ and $(6, 11)$?', ['1', '1.5', '2', '2.5', '3'], 'C', 'Slope $=\\frac{11-3}{6-2}=\\frac{8}{4}=2$.', 75],
  ['geometry', 'easy', 'Two angles of a triangle measure $40^\\circ$ and $75^\\circ$. What is the measure of the third angle?', ['55', '60', '65', '70', '75'], 'C', 'The angles of a triangle sum to $180^\\circ$, so the third is $180-40-75=65$ degrees.', 60],
  ['combinatorics', 'easy', 'A menu offers $2$ appetizers, $5$ main courses, and $6$ desserts. How many different three-course meals (one of each) are possible?', ['13', '30', '48', '60', '72'], 'D', '$2\\times 5\\times 6 = 60$ possible meals.', 75],
  ['percents', 'medium', 'A price of $100$ dollars is increased by $20\\%$ and then the new price is decreased by $20\\%$. What is the final price, in dollars?', ['96', '98', '100', '102', '104'], 'A', '$100\\times 1.20 = 120$, then $120\\times 0.80 = 96$.', 90],
  ['statistics', 'medium', 'Every number in a data set with mean $12$ is increased by $5$. What is the mean of the new set?', ['12', '15', '17', '19', '60'], 'C', 'Adding a constant to every value shifts the mean by that same constant: $12+5=17$.', 75],
  ['number properties', 'medium', 'What is the greatest common divisor of $48$ and $72$?', ['6', '8', '12', '24', '36'], 'D', '$48=2^4\\times 3$ and $72=2^3\\times 3^2$; the GCD is $2^3\\times 3 = 24$.', 90],
  ['number properties', 'hard', 'What is the units digit of $3^{17}$?', ['1', '3', '7', '9', '5'], 'B', 'The units digits of powers of $3$ cycle as $3, 9, 7, 1$. Since $17 = 4\\times 4 + 1$, the units digit is the first in the cycle: $3$.', 105],
  ['inequalities', 'medium', 'What is the least integer $x$ for which $\\frac{x+2}{4} > 3$?', ['10', '11', '12', '13', '14'], 'B', '$\\frac{x+2}{4}>3 \\Rightarrow x+2>12 \\Rightarrow x>10$. The least integer greater than $10$ is $11$.', 90],
  ['probability', 'easy', 'A bag contains $4$ red marbles and $6$ blue marbles. If one marble is drawn at random, what is the probability that it is red?', ['1/5', '2/5', '3/5', '1/2', '3/10'], 'B', 'There are $4+6=10$ marbles, so $P(\\text{red})=\\frac{4}{10}=\\frac{2}{5}$.', 60],
  ['combinatorics', 'medium', 'In how many ways can $2$ people be chosen from a group of $8$ (order does not matter)?', ['16', '28', '36', '56', '64'], 'B', '$\\binom{8}{2}=\\frac{8\\times 7}{2}=28$.', 90],
  ['fractions', 'medium', 'Which fraction is larger, $\\frac{5}{9}$ or $\\frac{4}{7}$?', ['5/9', '4/7', 'They are equal', 'Cannot be determined', 'Both equal 1/2'], 'B', 'Cross-multiplying: $5\\times 7 = 35$ and $4\\times 9 = 36$. Since $35<36$, $\\frac{4}{7}$ is larger.', 90],
  ['rates', 'medium', 'One worker can finish a job alone in $12$ hours and another can finish it alone in $6$ hours. Working together, how many hours do they take?', ['3', '4', '5', '6', '8'], 'B', 'Their combined rate is $\\frac{1}{12}+\\frac{1}{6}=\\frac{1}{12}+\\frac{2}{12}=\\frac{3}{12}=\\frac{1}{4}$ job per hour, so the time is $4$ hours.', 105],
  ['algebra', 'medium', 'Solve for $x$: $0.5x + 2 = 0.3(x + 10)$.', ['2', '3', '4', '5', '6'], 'D', '$0.5x+2=0.3x+3 \\Rightarrow 0.2x=1 \\Rightarrow x=5$.', 90],
];

// ── Data Sufficiency (16) ─────────────────────────────────────────────────────
// A=stmt1 alone, B=stmt2 alone, C=both together, D=each alone, E=neither.
const DS = [
  ['algebra', 'easy', 'What is the value of $x$?\n\n(1) $3x+2=14$\n(2) $x^2=16$', 'A', 'From (1), $3x=12$ so $x=4$ — sufficient. From (2), $x=4$ or $x=-4$ — not sufficient. Statement (1) alone suffices.'],
  ['number properties', 'medium', 'If $n$ is a positive integer, is $n>5$?\n\n(1) $n^2>20$\n(2) $n>6$', 'B', 'From (1), $n\\ge 5$ (since $4^2=16<20\\le 25=5^2$); but $n=5$ makes $n>5$ false while $n=6$ makes it true — not sufficient. From (2), $n>6$ implies $n>5$ — sufficient. Statement (2) alone suffices.'],
  ['geometry', 'medium', 'What is the area of rectangle $R$?\n\n(1) The length of $R$ is $10$.\n(2) The perimeter of $R$ is $28$.', 'C', 'Neither statement alone gives both dimensions. Together, length $=10$ and length $+$ width $=14$ give width $=4$, so the area is $40$. Both are needed.'],
  ['number properties', 'easy', 'Is the integer $x$ even?\n\n(1) $x = 2k$ for some integer $k$.\n(2) $\\frac{x}{2}$ is an integer.', 'D', 'Each statement independently means $x$ is a multiple of $2$, i.e., even. Each alone is sufficient.'],
  ['algebra', 'medium', 'What is the value of $x$?\n\n(1) $x>2$\n(2) $x<10$', 'E', 'Each statement gives only a range, and together they give $2<x<10$ — still many possible values. Not sufficient even together.'],
  ['rates', 'medium', 'Pipes A and B together fill a tank. How many hours do they take working together?\n\n(1) Pipe A alone fills the tank in $10$ hours.\n(2) Pipe B alone fills the tank in $15$ hours.', 'C', 'One rate alone is not enough. Together the combined rate is $\\frac{1}{10}+\\frac{1}{15}=\\frac{1}{6}$, giving $6$ hours. Both are needed.'],
  ['statistics', 'medium', 'How many students take at least one of mathematics or physics?\n\n(1) $18$ students take mathematics, $12$ take physics, and $4$ take both.\n(2) $8$ students take neither subject.', 'A', 'From (1), $18+12-4=26$ — sufficient. From (2), without total enrollment the count cannot be found — not sufficient. Statement (1) alone suffices.'],
  ['geometry', 'medium', 'Is triangle $T$ acute?\n\n(1) The three angles of $T$ measure $50^\\circ$, $60^\\circ$, and $70^\\circ$.\n(2) The largest angle of $T$ measures $80^\\circ$.', 'D', 'From (1), all three angles are below $90^\\circ$ — acute. From (2), if the largest angle is $80^\\circ<90^\\circ$, then all angles are acute. Each alone is sufficient.'],
  ['number properties', 'medium', 'Is $x<0$?\n\n(1) $x^3=-27$\n(2) $x^2=9$', 'A', 'From (1), $x=-3<0$ — sufficient. From (2), $x=3$ or $x=-3$ — not sufficient. Statement (1) alone suffices.'],
  ['number properties', 'medium', 'Is $x$ positive?\n\n(1) $x^2=16$\n(2) $x^3=64$', 'B', 'From (1), $x=4$ or $x=-4$ — not sufficient. From (2), $x=4>0$ — sufficient. Statement (2) alone suffices.'],
  ['statistics', 'easy', 'What is the sum of four numbers?\n\n(1) Their average (arithmetic mean) is $11$.\n(2) The largest of the four numbers is $20$.', 'A', 'From (1), the sum is $4\\times 11=44$ — sufficient. From (2), a single value gives no sum — not sufficient. Statement (1) alone suffices.'],
  ['number properties', 'medium', 'What is the two-digit integer $n$?\n\n(1) The tens digit of $n$ is $3$.\n(2) The units digit of $n$ is $7$.', 'C', 'From (1), $n$ is between $30$ and $39$. From (2), the units digit of $n$ is $7$. Together, $n=37$. Both statements are needed.'],
  ['number properties', 'medium', 'Is the integer $k$ divisible by $6$?\n\n(1) $k$ is divisible by $3$.\n(2) $k$ is divisible by $2$.', 'C', 'Divisibility by $6$ requires divisibility by both $2$ and $3$. Neither alone guarantees both; together they do. Both are needed.'],
  ['arithmetic', 'easy', 'What is the price of one notebook?\n\n(1) Three notebooks cost $45$ dollars.\n(2) Two notebooks cost $30$ dollars.', 'D', 'From (1), one costs $\\frac{45}{3}=15$. From (2), one costs $\\frac{30}{2}=15$. Each alone is sufficient.'],
  ['geometry', 'medium', 'Is quadrilateral $Q$ a square?\n\n(1) All four sides of $Q$ are equal.\n(2) All four angles of $Q$ are $90^\\circ$.', 'C', 'From (1) alone, $Q$ could be a non-square rhombus. From (2) alone, $Q$ could be a non-square rectangle. Together, equal sides and right angles make it a square. Both are needed.'],
  ['algebra', 'medium', 'Is $x>y$?\n\n(1) $x>0$\n(2) $y<5$', 'E', 'Neither bound relates $x$ and $y$ directly. With $x>0$ and $y<5$, for example $x=1,y=4$ gives $x<y$ while $x=1,y=-3$ gives $x>y$ — not sufficient even together.'],
];

// ── Graphics Interpretation (8) ───────────────────────────────────────────────
const dd = (key, before, after, opts) => ({ key, before, after, options: opts.map((v) => ({ value: String(v) })) });
const GI = [
  gi(1, {
    topic: 'trends', difficulty: 'easy',
    chart: { type: 'bar', title: 'Monthly Sales (units)', xKey: 'month', xLabel: 'Month', yLabel: 'Units', series: [{ key: 'units', label: 'Units' }], data: [{ month: 'Jan', units: 40 }, { month: 'Feb', units: 55 }, { month: 'Mar', units: 70 }, { month: 'Apr', units: 95 }] },
    dropdowns: [dd('b1', 'Sales in April were ', ' units.', [80, 85, 90, 95]), dd('b2', 'The increase from January to April was ', ' units.', [45, 50, 55, 60])],
    value: { b1: '95', b2: '55' },
    explanation: 'April sales were $95$ units. The increase from $40$ to $95$ is $95-40=55$ units.',
  }),
  gi(2, {
    topic: 'trends', difficulty: 'easy',
    chart: { type: 'line', title: 'Daily High Temperature (degrees C)', xKey: 'day', xLabel: 'Day', yLabel: 'Degrees C', series: [{ key: 'temp', label: 'Temperature' }], data: [{ day: 'Mon', temp: 12 }, { day: 'Tue', temp: 18 }, { day: 'Wed', temp: 15 }, { day: 'Thu', temp: 22 }, { day: 'Fri', temp: 19 }] },
    dropdowns: [dd('b1', 'The highest temperature recorded was ', ' degrees.', [18, 19, 20, 22]), dd('b2', 'The range (highest minus lowest) was ', ' degrees.', [8, 9, 10, 12])],
    value: { b1: '22', b2: '10' },
    explanation: 'The highest reading is $22$ and the lowest is $12$, so the range is $22-12=10$ degrees.',
  }),
  gi(3, {
    topic: 'comparison', difficulty: 'medium',
    chart: { type: 'bar', title: 'Revenue by Store (thousands of dollars)', xKey: 'store', xLabel: 'Store', yLabel: 'Revenue', series: [{ key: 'rev', label: 'Revenue' }], data: [{ store: 'A', rev: 20 }, { store: 'B', rev: 30 }, { store: 'C', rev: 40 }, { store: 'D', rev: 50 }] },
    dropdowns: [dd('b1', 'The average revenue per store was ', ' thousand.', [30, 35, 40, 45]), dd('b2', "Store D's revenue was ", " times Store A's.", ['2', '2.5', '3', '4'])],
    value: { b1: '35', b2: '2.5' },
    explanation: 'The average is $\\frac{20+30+40+50}{4}=35$ thousand. Store D earns $50$, which is $\\frac{50}{20}=2.5$ times Store A\'s $20$.',
  }),
  gi(4, {
    topic: 'trends', difficulty: 'easy',
    chart: { type: 'line', title: 'Subscribers (thousands)', xKey: 'week', xLabel: 'Week', yLabel: 'Subscribers', series: [{ key: 'subs', label: 'Subscribers' }], data: [{ week: 'W1', subs: 10 }, { week: 'W2', subs: 25 }, { week: 'W3', subs: 40 }, { week: 'W4', subs: 60 }] },
    dropdowns: [dd('b1', 'In Week 3 there were ', ' thousand subscribers.', [30, 35, 40, 45]), dd('b2', 'From Week 1 to Week 4 subscribers increased by ', ' thousand.', [40, 45, 50, 55])],
    value: { b1: '40', b2: '50' },
    explanation: 'Week 3 shows $40$ thousand subscribers. The increase from $10$ to $60$ is $60-10=50$ thousand.',
  }),
  gi(5, {
    topic: 'percent', difficulty: 'medium',
    chart: { type: 'bar', title: 'Defects per Day', xKey: 'day', xLabel: 'Day', yLabel: 'Defects', series: [{ key: 'defects', label: 'Defects' }], data: [{ day: 'D1', defects: 120 }, { day: 'D2', defects: 90 }, { day: 'D3', defects: 48 }, { day: 'D4', defects: 30 }] },
    dropdowns: [dd('b1', 'On Day 3 there were ', ' defects.', [40, 45, 48, 52]), dd('b2', 'From Day 1 to Day 3 the number of defects fell by ', '.', ['40 percent', '50 percent', '60 percent', '72 percent'])],
    value: { b1: '48', b2: '60 percent' },
    explanation: 'Day 3 had $48$ defects. The drop from $120$ to $48$ is $72$, and $\\frac{72}{120}=0.6$, a $60$ percent decrease.',
  }),
  gi(6, {
    topic: 'comparison', difficulty: 'easy',
    chart: { type: 'bar', title: 'Tickets Sold by City', xKey: 'city', xLabel: 'City', yLabel: 'Tickets', series: [{ key: 'tickets', label: 'Tickets' }], data: [{ city: 'A', tickets: 150 }, { city: 'B', tickets: 210 }, { city: 'C', tickets: 180 }, { city: 'D', tickets: 240 }] },
    dropdowns: [dd('b1', 'The greatest number of tickets sold by any city was ', '.', [210, 220, 230, 240]), dd('b2', 'The difference between the highest and lowest totals was ', '.', [60, 80, 90, 100])],
    value: { b1: '240', b2: '90' },
    explanation: 'The maximum is $240$ (City D) and the minimum is $150$ (City A), a difference of $240-150=90$.',
  }),
  gi(7, {
    topic: 'statistics', difficulty: 'medium',
    chart: { type: 'line', title: 'Monthly Rainfall (mm)', xKey: 'month', xLabel: 'Month', yLabel: 'Rainfall', series: [{ key: 'rain', label: 'Rainfall' }], data: [{ month: 'Jan', rain: 20 }, { month: 'Feb', rain: 30 }, { month: 'Mar', rain: 25 }, { month: 'Apr', rain: 35 }] },
    dropdowns: [dd('b1', 'Total rainfall over the four months was ', ' mm.', [100, 105, 110, 115]), dd('b2', 'The average monthly rainfall was ', ' mm.', ['25', '27.5', '30', '32.5'])],
    value: { b1: '110', b2: '27.5' },
    explanation: 'The total is $20+30+25+35=110$ mm, so the average is $\\frac{110}{4}=27.5$ mm.',
  }),
  gi(8, {
    topic: 'percent', difficulty: 'medium',
    chart: { type: 'bar', title: 'Quarterly Production (units)', xKey: 'quarter', xLabel: 'Quarter', yLabel: 'Units', series: [{ key: 'prod', label: 'Production' }], data: [{ quarter: 'Q1', prod: 200 }, { quarter: 'Q2', prod: 250 }, { quarter: 'Q3', prod: 300 }, { quarter: 'Q4', prod: 450 }] },
    dropdowns: [dd('b1', 'Production in Q4 was ', ' units.', [350, 400, 450, 500]), dd('b2', 'The percent increase from Q1 to Q4 was ', '.', ['100 percent', '110 percent', '125 percent', '150 percent'])],
    value: { b1: '450', b2: '125 percent' },
    explanation: 'Q4 production was $450$. The increase from $200$ to $450$ is $250$, and $\\frac{250}{200}=1.25$, a $125$ percent increase.',
  }),
];

// ── Table Analysis (10) ───────────────────────────────────────────────────────
const st = (...texts) => texts.map((text, i) => ({ key: 's' + (i + 1), text }));
const TA = [
  ta(1, {
    topic: 'comparison', difficulty: 'medium', caption: 'Store Performance',
    columns: [{ key: 'store', label: 'Store' }, { key: 'visitors', label: 'Visitors', numeric: true }, { key: 'sales', label: 'Sales', numeric: true }],
    rows: [{ store: 'P', visitors: 400, sales: 80 }, { store: 'Q', visitors: 500, sales: 90 }, { store: 'R', visitors: 300, sales: 75 }, { store: 'S', visitors: 450, sales: 99 }],
    statements: st('Store P has the most visitors.', 'Store S converts more than 20 percent of its visitors into sales.', 'Store R has fewer sales than Store P.'),
    value: { s1: 'False', s2: 'True', s3: 'True' },
    explanation: 'Store Q has $500$ visitors, the most, so the first statement is false. Store S: $\\frac{99}{450}\\approx 22\\%>20\\%$ (true). Store R sales $75<80$ Store P (true).',
  }),
  ta(2, {
    topic: 'comparison', difficulty: 'easy', caption: 'Department Budget vs. Spend (thousands)',
    columns: [{ key: 'dept', label: 'Department' }, { key: 'budget', label: 'Budget', numeric: true }, { key: 'spend', label: 'Spend', numeric: true }],
    rows: [{ dept: 'Marketing', budget: 40, spend: 42 }, { dept: 'Sales', budget: 60, spend: 55 }, { dept: 'IT', budget: 50, spend: 50 }, { dept: 'HR', budget: 30, spend: 28 }],
    statements: st('Marketing stayed within its budget.', 'HR spent less than its budget.', "IT's spend equaled its budget."),
    value: { s1: 'False', s2: 'True', s3: 'True' },
    explanation: 'Marketing spent $42>40$, over budget (false). HR spent $28<30$ (true). IT spent $50=50$ (true).',
  }),
  ta(3, {
    topic: 'rates', difficulty: 'medium', caption: 'Worker Output',
    columns: [{ key: 'worker', label: 'Worker' }, { key: 'hours', label: 'Hours', numeric: true }, { key: 'rate', label: 'Units/Hour', numeric: true }],
    rows: [{ worker: 'Ana', hours: 20, rate: 15 }, { worker: 'Ben', hours: 18, rate: 16 }, { worker: 'Cara', hours: 22, rate: 14 }, { worker: 'Dan', hours: 16, rate: 18 }],
    statements: st('Cara worked the most hours.', 'Ben produced more total units than Cara.', 'Dan has the highest output rate.'),
    value: { s1: 'True', s2: 'False', s3: 'True' },
    explanation: "Cara's $22$ hours is the most (true). Ben: $18\\times 16=288$ units; Cara: $22\\times 14=308$ units; $288<308$, so false. Dan's rate $18$ is the highest (true).",
  }),
  ta(4, {
    topic: 'comparison', difficulty: 'easy', caption: 'Site Traffic',
    columns: [{ key: 'site', label: 'Site' }, { key: 'weekday', label: 'Weekday', numeric: true }, { key: 'weekend', label: 'Weekend', numeric: true }],
    rows: [{ site: 'A', weekday: 30, weekend: 50 }, { site: 'B', weekday: 40, weekend: 45 }, { site: 'C', weekday: 35, weekend: 55 }],
    statements: st('Site A has higher weekday traffic than Site C.', "Site B's weekly total exceeds Site A's.", 'Site C has the highest weekend traffic.'),
    value: { s1: 'False', s2: 'True', s3: 'True' },
    explanation: 'Site A weekday $30<35$ Site C, so "higher" is false. Site B total $40+45=85>30+50=80$ Site A (true). Site C weekend $55$ is the highest (true).',
  }),
  ta(5, {
    topic: 'percent', difficulty: 'hard', caption: 'Regional Shipments',
    columns: [{ key: 'region', label: 'Region' }, { key: 'units', label: 'Units', numeric: true }, { key: 'returns', label: 'Returns', numeric: true }],
    rows: [{ region: 'North', units: 300, returns: 12 }, { region: 'South', units: 280, returns: 10 }, { region: 'East', units: 260, returns: 15 }, { region: 'West', units: 320, returns: 14 }],
    statements: st('West shipped the most units.', 'South had the lowest return rate.', "North's return rate exceeds East's."),
    value: { s1: 'True', s2: 'True', s3: 'False' },
    explanation: "West's $320$ units is the most (true). Return rates: North $\\frac{12}{300}=4\\%$, South $\\frac{10}{280}\\approx 3.6\\%$, East $\\frac{15}{260}\\approx 5.8\\%$, West $\\frac{14}{320}\\approx 4.4\\%$; South is lowest (true). North $4\\%<$ East $5.8\\%$, so \"exceeds\" is false.",
  }),
  ta(6, {
    topic: 'percent', difficulty: 'medium', caption: 'Course Results',
    columns: [{ key: 'course', label: 'Course' }, { key: 'pass', label: 'Pass', numeric: true }, { key: 'fail', label: 'Fail', numeric: true }],
    rows: [{ course: 'Math', pass: 40, fail: 10 }, { course: 'Science', pass: 45, fail: 5 }, { course: 'History', pass: 30, fail: 20 }, { course: 'Art', pass: 28, fail: 2 }],
    statements: st("History's failure rate is 40 percent.", 'Science had fewer passes than Math.', 'Art had the fewest failures.'),
    value: { s1: 'True', s2: 'False', s3: 'True' },
    explanation: 'History: $\\frac{20}{50}=40\\%$ (true). Science passes $45>40$ Math, so "fewer" is false. Art\'s $2$ failures is the fewest (true).',
  }),
  ta(7, {
    topic: 'comparison', difficulty: 'medium', caption: 'Monthly Costs (dollars)',
    columns: [{ key: 'month', label: 'Month' }, { key: 'rent', label: 'Rent', numeric: true }, { key: 'utilities', label: 'Utilities', numeric: true }],
    rows: [{ month: 'Jan', rent: 1200, utilities: 200 }, { month: 'Feb', rent: 1200, utilities: 250 }, { month: 'Mar', rent: 1200, utilities: 180 }],
    statements: st('Total cost was highest in February.', 'Utilities in March were below 200.', 'Rent varied from month to month.'),
    value: { s1: 'True', s2: 'True', s3: 'False' },
    explanation: 'Totals: Jan $1400$, Feb $1450$, Mar $1380$; February is highest (true). March utilities $180<200$ (true). Rent is $1200$ every month, so it did not vary (false).',
  }),
  ta(8, {
    topic: 'comparison', difficulty: 'easy', caption: 'Game Scores',
    columns: [{ key: 'team', label: 'Team' }, { key: 'game1', label: 'Game 1', numeric: true }, { key: 'game2', label: 'Game 2', numeric: true }],
    rows: [{ team: 'Red', game1: 70, game2: 80 }, { team: 'Blue', game1: 90, game2: 60 }, { team: 'Green', game1: 75, game2: 85 }],
    statements: st('Blue scored the most in Game 1.', "Green's two-game total exceeds Red's.", 'Red scored higher in Game 1 than in Game 2.'),
    value: { s1: 'True', s2: 'True', s3: 'False' },
    explanation: "Blue's $90$ leads Game 1 (true). Green $75+85=160>70+80=150$ Red (true). Red $70<80$, so \"higher in Game 1\" is false.",
  }),
  ta(9, {
    topic: 'comparison', difficulty: 'medium', caption: 'Inventory Levels',
    columns: [{ key: 'item', label: 'Item' }, { key: 'stock', label: 'Stock', numeric: true }, { key: 'reorder', label: 'Reorder Level', numeric: true }],
    rows: [{ item: 'Widget', stock: 50, reorder: 40 }, { item: 'Gadget', stock: 30, reorder: 35 }, { item: 'Gizmo', stock: 20, reorder: 20 }, { item: 'Doohickey', stock: 60, reorder: 45 }],
    statements: st('Gadget is below its reorder level.', 'Widget has the highest stock.', "Gizmo's stock equals its reorder level."),
    value: { s1: 'True', s2: 'False', s3: 'True' },
    explanation: 'Gadget stock $30<35$ reorder level (true). Doohickey\'s $60$ exceeds Widget\'s $50$, so Widget is not highest (false). Gizmo $20=20$ (true).',
  }),
  ta(10, {
    topic: 'percent', difficulty: 'medium', caption: 'City Population (thousands)',
    columns: [{ key: 'city', label: 'City' }, { key: 'y2020', label: '2020', numeric: true }, { key: 'y2023', label: '2023', numeric: true }],
    rows: [{ city: 'Alpha', y2020: 100, y2023: 130 }, { city: 'Beta', y2020: 200, y2023: 180 }, { city: 'Gamma', y2020: 150, y2023: 165 }],
    statements: st("Beta's population decreased.", 'Alpha grew by 30 percent.', 'Gamma grew faster than Alpha.'),
    value: { s1: 'True', s2: 'True', s3: 'False' },
    explanation: 'Beta fell from $200$ to $180$ (true). Alpha: $\\frac{130-100}{100}=30\\%$ (true). Gamma: $\\frac{165-150}{150}=10\\%<30\\%$, so "faster" is false.',
  }),
];

// ── Two-Part Analysis (8) ─────────────────────────────────────────────────────
const FIVE = [4, 6, 8, 10, 12]; // r1..r5
const TP = [
  tp(1, { topic: 'arithmetic', difficulty: 'easy', exprA: '$3+5$', exprB: '$24\\div 4$', choices: FIVE, value: { partA: 'r3', partB: 'r2' }, explanation: 'Part A: $3+5=8$, which is option r3. Part B: $24\\div 4=6$, which is option r2.' }),
  tp(2, { topic: 'arithmetic', difficulty: 'easy', exprA: '$2\\times 5$', exprB: '$14-6$', choices: FIVE, value: { partA: 'r4', partB: 'r3' }, explanation: 'Part A: $2\\times 5=10$, which is option r4. Part B: $14-6=8$, which is option r3.' }),
  tp(3, { topic: 'arithmetic', difficulty: 'easy', exprA: '$\\frac{36}{6}$', exprB: '$2^2+8$', choices: FIVE, value: { partA: 'r2', partB: 'r5' }, explanation: 'Part A: $\\frac{36}{6}=6$, which is option r2. Part B: $2^2+8=12$, which is option r5.' }),
  tp(4, { topic: 'arithmetic', difficulty: 'medium', exprA: '$20-2\\times 8$', exprB: '$\\frac{60}{6}$', choices: FIVE, value: { partA: 'r1', partB: 'r4' }, explanation: 'Part A: $20-2\\times 8 = 20-16 = 4$, which is option r1. Part B: $\\frac{60}{6}=10$, which is option r4.' }),
  tp(5, { topic: 'arithmetic', difficulty: 'easy', exprA: '$3\\times 4$', exprB: '$\\sqrt{64}$', choices: FIVE, value: { partA: 'r5', partB: 'r3' }, explanation: 'Part A: $3\\times 4=12$, which is option r5. Part B: $\\sqrt{64}=8$, which is option r3.' }),
  tp(6, { topic: 'arithmetic', difficulty: 'easy', exprA: '$\\frac{18}{3}$', exprB: '$5+5$', choices: FIVE, value: { partA: 'r2', partB: 'r4' }, explanation: 'Part A: $\\frac{18}{3}=6$, which is option r2. Part B: $5+5=10$, which is option r4.' }),
  tp(7, { topic: 'arithmetic', difficulty: 'easy', exprA: '$2\\times 2$', exprB: '$48\\div 4$', choices: FIVE, value: { partA: 'r1', partB: 'r5' }, explanation: 'Part A: $2\\times 2=4$, which is option r1. Part B: $48\\div 4=12$, which is option r5.' }),
  tp(8, { topic: 'arithmetic', difficulty: 'medium', exprA: '$30-22$', exprB: '$\\frac{18}{3}+4$', choices: FIVE, value: { partA: 'r3', partB: 'r4' }, explanation: 'Part A: $30-22=8$, which is option r3. Part B: $\\frac{18}{3}+4 = 6+4 = 10$, which is option r4.' }),
];

// ── Critical Reasoning (14) ───────────────────────────────────────────────────
const CR = [
  ['assumption', 'medium', "A bakery introduced a loyalty card and then saw repeat visits rise. The owner concludes that the card caused the increase in repeat visits.\n\nThe owner's conclusion depends on which of the following assumptions?", ['No other change that could raise repeat visits occurred during the same period.', 'Customers prefer loyalty cards to discount coupons.', 'Repeat visits are more profitable than first-time visits.', 'Every customer signed up for the loyalty card.', "The bakery's prices matched those of competitors."], 'A', 'The owner attributes the rise solely to the card; this holds only if no other factor (a new product, more foot traffic, etc.) explains the increase. (A) states exactly that assumption.'],
  ['weaken', 'medium', 'A town installed streetlights on several roads, and nighttime traffic accidents subsequently fell. Officials claim the lights reduced the accidents.\n\nWhich of the following, if true, most weakens the claim?', ["The lights are costly to maintain.", 'A nearby factory closed during the same period, sharply reducing late-night driving on those roads.', 'Daytime accident counts were unchanged.', 'Drivers reported feeling safer after the lights were installed.', 'Neighboring towns also installed streetlights.'], 'B', 'If far fewer cars were on the roads at night because the factory closed, the drop in accidents could be due to reduced exposure rather than the lights — undermining the causal claim.'],
  ['strengthen', 'medium', 'A nutritionist argues that a new cereal lowers cholesterol, citing that participants who ate it daily for eight weeks had lower cholesterol afterward.\n\nWhich of the following, if true, most strengthens the argument?', ['The cereal tastes better than competing brands.', 'A comparable group who did not eat the cereal showed no change in cholesterol over the same eight weeks.', 'The cereal is high in dietary fiber.', 'Cholesterol can also be lowered through exercise.', 'The study ran for a full eight weeks.'], 'B', 'A control group with no change rules out the possibility that cholesterol fell for everyone regardless of the cereal, isolating the cereal as the cause.'],
  ['inference', 'easy', 'Only those who completed the safety course received a badge. No contractor completed the safety course.\n\nWhich of the following must be true?', ['No contractor received a badge.', 'Every employee received a badge.', 'Some contractors received badges.', 'All badge holders are contractors.', 'The safety course was mandatory.'], 'A', 'Since a badge requires completing the course and no contractor completed it, no contractor could have received a badge.'],
  ['flaw', 'medium', 'Critic: A poll shows that most readers favor the magazine\'s new layout, so the new layout is objectively better than the old one.\n\nThe critic\'s reasoning is most vulnerable to the objection that it', ['relies on a sample that is too small to be reliable.', 'confuses what is popular with what is objectively better.', 'ignores the cost of producing the new layout.', 'assumes the readers are design experts.', 'appeals to an irrelevant authority.'], 'B', 'Preference among readers establishes popularity, not objective quality; treating the two as the same is the flaw.'],
  ['paradox', 'medium', 'Despite cutting its advertising budget in half this year, a company saw its sales rise.\n\nWhich of the following, if true, best explains this result?', ['Each of the company\'s main competitors raised prices sharply this year, driving many of their customers to the company.', 'The company\'s past advertisements had won industry awards.', 'Advertising generally tends to increase a company\'s sales.', 'The company hired a new marketing director this year.', "Sales fell at the company's largest rival the previous year."], 'A', 'A large shift of customers from competitors who raised prices explains how sales could rise even though the company spent less on advertising.'],
  ['evaluate', 'medium', 'A city plans to reduce downtown congestion by raising parking fees.\n\nTo evaluate whether the plan will achieve its goal, it would be most useful to know which of the following?', ['Whether most people who drive downtown have a practical alternative to driving there.', 'How much additional revenue the higher fees will raise.', 'When the new fees will take effect.', 'Which downtown streets are currently the busiest.', 'How neighboring cities set their parking fees.'], 'A', 'If drivers have no alternative, higher fees will not reduce how many drive downtown; whether alternatives exist is decisive for the plan\'s success.'],
  ['weaken', 'medium', 'Manager: Our new sales-training program works — representatives who completed it now outperform those who did not.\n\nWhich of the following, if true, most weakens the conclusion that the program causes better performance?', ['The program is shorter than the previous one.', 'Only the company\'s most experienced representatives were selected to take the program.', 'Companywide sales rose this year.', 'The representatives said they enjoyed the program.', 'Training programs are common in the industry.'], 'B', 'If the strongest representatives were the ones chosen for the program, their superior performance may reflect prior skill, not the program — a selection bias that undercuts the causal claim.'],
  ['inference', 'medium', 'Every book in the store\'s sale section is a paperback. Some paperbacks in the store are not on sale.\n\nWhich of the following must be true?', ['Some books in the store are not in the sale section.', 'All paperbacks in the store are on sale.', 'No hardcover books are in the store.', 'Some books in the sale section are hardcovers.', 'Most of the store\'s books are paperbacks.'], 'A', 'A paperback that is not on sale cannot be in the sale section, so at least one book in the store lies outside the sale section.'],
  ['strengthen', 'medium', 'Researcher: Cities with more bike lanes tend to have lower obesity rates, so building bike lanes reduces obesity.\n\nWhich of the following, if true, most strengthens the argument?', ['Bike lanes are popular with city residents.', 'In several cities, obesity rates declined in the years after new bike lanes were added.', 'People who are obese rarely ride bicycles.', 'Bike lanes reduce automobile traffic.', 'Cycling burns a substantial number of calories.'], 'B', 'Showing that obesity fell after bike lanes were added supports the direction of causation, rather than merely a correlation between the two.'],
  ['flaw', 'easy', 'Politician: My opponent argues that we should cut public spending, but he once overspent his own campaign budget. His proposal should therefore be rejected.\n\nThe politician\'s argument is most vulnerable to criticism on the grounds that it', ['attacks the opponent\'s character instead of the merits of his proposal.', 'depends on a sample that is too small.', 'assumes that all spending is harmful.', 'relies on an emotional appeal to voters.', 'confuses correlation with causation.'], 'A', 'Citing the opponent\'s past behavior rather than addressing the proposal itself is an ad hominem attack, which does not bear on whether the proposal is sound.'],
  ['paradox', 'medium', 'A store moved its bestselling items from the front to the back. Those items then sold slightly less, yet the store\'s overall sales increased.\n\nWhich of the following best explains the increase in overall sales?', ['The bestselling items were already popular before the move.', 'To reach the bestsellers at the back, customers walked past many other products and bought more of them.', 'The store lowered the prices of its bestselling items.', 'The store extended its opening hours after the move.', 'Bestselling items are usually displayed near the entrance.'], 'B', 'Routing customers past more merchandise raises purchases of other items, which can lift overall sales even as the bestsellers sell a bit less.'],
  ['assumption', 'medium', 'A school district will provide every student with a tablet in order to raise test scores, reasoning that students who already own tablets tend to score higher.\n\nThe plan depends on which of the following assumptions?', ['Tablets are affordable for the district to purchase in bulk.', 'The higher scores of current tablet owners are due to the tablets themselves, not to other advantages those students have.', 'Every student will actually use the tablet provided.', 'Teachers in the district support the change.', 'The tablets will remain usable for several years.'], 'B', 'The plan assumes the tablet causes the higher scores. If tablet owners score higher because of other advantages (e.g., wealth), giving tablets to all students would not reproduce the effect.'],
  ['evaluate', 'medium', 'An airline claims that its new boarding procedure speeds up boarding compared with the old one.\n\nTo evaluate this claim, it would be most helpful to determine which of the following?', ['Whether the new procedure was tested on flights of the same size and aircraft type as the old procedure.', 'Whether passengers find the new procedure pleasant.', 'Whether competing airlines use a similar procedure.', 'How much it costs to train staff in the new procedure.', 'Whether the airline advertised the change to passengers.'], 'A', 'A fair comparison requires similar conditions; if the procedures were tested on very different flights, any difference in boarding time may be due to those differences rather than the procedure.'],
];

// ── Reading Comprehension (12) ────────────────────────────────────────────────
const GROUPS = [
  {
    id: 'rc-d1', section: 'verbal', title: 'Coral reef restoration',
    passage: 'Coral reefs, often called the rainforests of the sea, support roughly a quarter of all marine species despite covering less than one percent of the ocean floor. As warming waters trigger bleaching events, researchers have turned to active restoration. One widely publicized technique, coral gardening, involves growing coral fragments in underwater nurseries and then transplanting them onto degraded reefs. Early results are encouraging: transplanted colonies can grow quickly and begin reproducing within a few years. Yet some scientists caution that gardening treats symptoms rather than causes. Restored corals remain vulnerable to the same heat stress that killed their predecessors, and the labor involved makes large-scale application costly. A more promising long-term avenue, these critics argue, lies in identifying and propagating naturally heat-tolerant strains. Such "super corals" might withstand future warming, but breeding them is slow, and introducing them widely raises ecological questions about reducing genetic diversity. Most experts agree that restoration can buy time, but only if it is paired with sharp reductions in the greenhouse-gas emissions driving ocean warming in the first place.',
  },
  {
    id: 'rc-d2', section: 'verbal', title: 'Remote work and cities',
    passage: 'The rapid shift to remote work has prompted predictions that major cities will hollow out as employees abandon expensive downtowns. The evidence so far is more nuanced. While occupancy in central business districts has fallen and some firms have shed office space, residential demand in many large cities has proved resilient. Workers who no longer commute daily still value access to cultural amenities, professional networks, and the occasional in-person collaboration that remote tools cannot fully replace. Economists note that the geography of work is being redistributed rather than abandoned: activity is spreading from downtown cores toward neighborhood centers and nearby suburbs, where former commuters now spend their lunch hours and salaries. This redistribution strains municipal budgets that depend on commercial property taxes and downtown foot traffic, even as it benefits outlying businesses. Whether a city ultimately gains or loses may depend less on remote work itself than on how quickly local governments adapt zoning, transit, and tax policy to a more dispersed pattern of daily life.',
  },
  {
    id: 'rc-d3', section: 'verbal', title: 'The free public library',
    passage: 'In the nineteenth century, the free public library emerged as one of the era\'s most ambitious civic experiments. Earlier collections had been private or subscription-based, open only to those who could pay annual fees. Reformers argued that a literate, self-improving citizenry was essential to a functioning democracy and that access to books should not depend on wealth. Their campaign met resistance. Skeptics questioned why taxpayers should fund the leisure reading of strangers, and some feared that unrestricted access to novels would corrupt public morals. Supporters countered that libraries would reduce crime by offering productive alternatives to idleness and would equip workers with practical knowledge. Philanthropists eventually accelerated the movement, donating buildings on the condition that municipalities agree to stock and maintain them with public funds. This arrangement spread libraries rapidly, but it also tied their fate to local tax revenues, leaving poorer communities with thinner collections. The free library thus embodied a tension that persists in public institutions today: a promise of universal access constrained by uneven local resources.',
  },
];

const RC = [
  // rc-d1
  rcq('rc-d1', 0, 'q1', ['main idea', 'medium', 'The primary purpose of the passage is to', ['argue that coral gardening should be abandoned in favor of breeding heat-tolerant strains.', 'describe efforts to restore coral reefs while noting their limitations and the need to address ocean warming.', 'prove that coral reefs can no longer be saved.', 'compare the financial costs of two restoration techniques in detail.', 'celebrate the success of underwater coral nurseries.'], 'B', 'The passage presents restoration techniques, their drawbacks, and the conclusion that they help only alongside emissions cuts — a balanced overview, which (B) captures.']),
  rcq('rc-d1', 1, 'q2', ['detail', 'easy', 'According to the passage, coral gardening involves', ['breeding heat-tolerant strains in laboratories.', 'growing coral fragments in nurseries and transplanting them onto reefs.', 'reducing greenhouse-gas emissions at their source.', 'relocating fish to degraded reefs.', 'covering the ocean floor with artificial structures.'], 'B', 'The passage defines coral gardening as growing fragments in underwater nurseries and transplanting them onto degraded reefs.']),
  rcq('rc-d1', 2, 'q3', ['inference', 'medium', 'The passage suggests that "super corals" would be especially valuable because they', ['grow faster than gardened corals.', 'could survive the heat stress that threatens ordinary corals.', 'are cheaper to produce than nursery corals.', 'would increase the genetic diversity of reefs.', 'eliminate the need to reduce emissions.'], 'B', 'Super corals are described as naturally heat-tolerant strains that "might withstand future warming," so their value lies in surviving heat stress.']),
  rcq('rc-d1', 3, 'q4', ['tone', 'medium', "The author's attitude toward coral restoration is best described as", ['unreserved enthusiasm.', 'open hostility.', 'cautious support.', 'complete indifference.', 'resigned hopelessness.'], 'C', 'The author acknowledges encouraging results yet repeatedly notes limitations and conditions, reflecting cautious support.']),
  // rc-d2
  rcq('rc-d2', 0, 'q1', ['main idea', 'medium', 'The passage is primarily concerned with', ['predicting the imminent collapse of major cities.', 'examining how remote work is reshaping, rather than emptying, urban areas.', 'advising individual workers on where they should live.', 'criticizing the tax policies of municipal governments.', 'describing the software tools that make remote work possible.'], 'B', 'The passage argues that work is being redistributed within and around cities rather than abandoned, making (B) the central concern.']),
  rcq('rc-d2', 1, 'q2', ['detail', 'easy', 'According to the passage, which of the following has proved resilient despite the shift to remote work?', ['Downtown office occupancy.', 'Commercial property tax revenue.', 'Residential demand in many large cities.', 'Daily commuting into city centers.', 'Downtown foot traffic.'], 'C', 'The passage states that "residential demand in many large cities has proved resilient."']),
  rcq('rc-d2', 2, 'q3', ['inference', 'medium', 'The passage implies that some municipal budgets are strained because they', ['depend heavily on downtown commercial activity and property taxes.', 'are legally unable to tax remote workers.', 'have stopped receiving any transit funding.', 'rely chiefly on tourism for revenue.', 'are controlled by suburban governments.'], 'A', 'The passage says the redistribution strains budgets "that depend on commercial property taxes and downtown foot traffic," implying reliance on downtown activity.']),
  rcq('rc-d2', 3, 'q4', ['function', 'medium', 'The author mentions that former commuters now spend their "lunch hours and salaries" near neighborhood centers in order to', ['criticize remote workers for spending money carelessly.', 'illustrate how economic activity is being redistributed geographically.', 'argue that suburbs are superior places to live than downtowns.', 'explain why firms have reduced their office space.', 'show that daily commuting has increased.'], 'B', 'The detail is offered as a concrete example of activity shifting away from downtown cores toward outlying areas.']),
  // rc-d3
  rcq('rc-d3', 0, 'q1', ['main idea', 'medium', 'The primary purpose of the passage is to', ['trace the rise of the free public library and the debates that surrounded it.', 'argue that subscription libraries were superior to free ones.', 'describe the architecture of nineteenth-century library buildings.', 'prove that public libraries measurably reduced crime.', 'criticize philanthropists for the conditions they attached to donations.'], 'A', 'The passage narrates the emergence of the free public library and the arguments for and against it, which (A) summarizes.']),
  rcq('rc-d3', 1, 'q2', ['detail', 'easy', 'According to the passage, subscription libraries differed from free public libraries in that they', ['were funded entirely by philanthropists.', 'required users to pay fees for access.', 'contained only practical, non-fiction books.', 'were open exclusively to workers.', 'were maintained by municipal governments.'], 'B', 'The passage says earlier collections were "subscription-based, open only to those who could pay annual fees."']),
  rcq('rc-d3', 2, 'q3', ['detail', 'medium', 'Which of the following is identified in the passage as an argument made by supporters of free libraries?', ['Unrestricted access to novels would corrupt public morals.', 'Taxpayers should not be made to fund strangers\' reading.', 'Libraries would reduce crime by offering alternatives to idleness.', 'Access to books should depend on a person\'s wealth.', 'Philanthropists should retain control over the collections.'], 'C', 'Supporters "countered that libraries would reduce crime by offering productive alternatives to idleness," matching (C). The other options are objections or unrelated.']),
  rcq('rc-d3', 3, 'q4', ['inference', 'medium', 'The passage suggests that tying libraries to local tax revenue resulted in', ['uniformly excellent collections across the country.', 'the end of all philanthropic donations.', 'unequal library quality between richer and poorer communities.', 'a return to subscription fees.', 'a reduction in overall public access to books.'], 'C', 'The passage states the arrangement left "poorer communities with thinner collections," implying quality varied with local wealth.']),
];

// ── Assemble + write ──────────────────────────────────────────────────────────
const quant = PS.map((row, i) => ps(i + 1, row));
const verbal = [...CR.map((row, i) => cr(i + 1, row)), ...RC];
const dataInsights = [...DS.map((row, i) => ds(i + 1, row)), ...GI, ...TA, ...TP];

const out = (rel, data) => {
  const file = resolve(root, rel);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`  wrote ${rel} (${Array.isArray(data) ? data.length : 0} items)`);
};

out('content/questions/quant-10.json', quant);
out('content/questions/verbal-10.json', verbal);
out('content/questions/data_insights-10.json', dataInsights);
out('content/question_groups-7.json', GROUPS);

console.log(
  `\nbatch10: ${quant.length} quant + ${verbal.length} verbal + ${dataInsights.length} data_insights = ${quant.length + verbal.length + dataInsights.length} questions, ${GROUPS.length} groups`,
);

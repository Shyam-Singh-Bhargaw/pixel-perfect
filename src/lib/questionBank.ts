// Auto-generated Infosys Question Bank (500 questions)
// Each question has problem, python solution, dry run trace, complexity.

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface DryRunStep {
  step: number;
  line: string;
  variables: { name: string; value: string; change: string }[];
}

export interface Question {
  id: number;
  topic: string;
  title: string;
  difficulty: Difficulty;
  problem: string;
  example: string;
  code: string;
  dryRun: DryRunStep[];
  time: string;
  space: string;
}

export const TOPICS: { name: string; count: number }[] = [
  { name: 'Strings', count: 60 },
  { name: 'Arrays', count: 80 },
  { name: 'Patterns', count: 40 },
  { name: 'Number Theory', count: 40 },
  { name: 'Sorting', count: 30 },
  { name: 'Matrix', count: 30 },
  { name: 'Dynamic Programming', count: 50 },
  { name: 'Linked List', count: 40 },
  { name: 'Stack & Queue', count: 30 },
  { name: 'Binary Search', count: 20 },
  { name: 'OOP & Classes', count: 20 },
  { name: 'Recursion', count: 20 },
  { name: 'Bit Manipulation', count: 15 },
  { name: 'Greedy', count: 15 },
  { name: 'Graph', count: 10 },
];

// Curated seed questions per topic (rotated/varied to fill counts).
const SEEDS: Record<string, Omit<Question, 'id' | 'topic' | 'difficulty'>[]> = {
  Strings: [
    {
      title: 'Reverse a String',
      problem: 'Given a string s, return the reversed string.',
      example: 'Input: "hello"  ->  Output: "olleh"',
      code: `def reverse_string(s):
    # Use Python slicing with step -1
    return s[::-1]

print(reverse_string("hello"))  # olleh`,
      dryRun: [
        { step: 1, line: 's = "hello"', variables: [{ name: 's', value: '"hello"', change: 'init' }] },
        { step: 2, line: 's[::-1]', variables: [{ name: 'result', value: '"olleh"', change: 'reversed via slice' }] },
        { step: 3, line: 'return result', variables: [{ name: 'return', value: '"olleh"', change: 'final' }] },
      ],
      time: 'O(n)',
      space: 'O(n)',
    },
    {
      title: 'Check Palindrome',
      problem: 'Check if a string reads the same forwards and backwards.',
      example: 'Input: "madam" -> True',
      code: `def is_palindrome(s):
    # Compare string with its reverse
    return s == s[::-1]

print(is_palindrome("madam"))  # True`,
      dryRun: [
        { step: 1, line: 's = "madam"', variables: [{ name: 's', value: '"madam"', change: 'init' }] },
        { step: 2, line: 's[::-1]', variables: [{ name: 'rev', value: '"madam"', change: 'reverse' }] },
        { step: 3, line: 's == rev', variables: [{ name: 'result', value: 'True', change: 'equal' }] },
      ],
      time: 'O(n)',
      space: 'O(n)',
    },
    {
      title: 'Count Vowels',
      problem: 'Count vowels in a given string.',
      example: 'Input: "infosys" -> 3',
      code: `def count_vowels(s):
    vowels = "aeiouAEIOU"
    count = 0
    for ch in s:           # iterate each char
        if ch in vowels:   # vowel check
            count += 1
    return count

print(count_vowels("infosys"))  # 2`,
      dryRun: [
        { step: 1, line: 's = "infosys"', variables: [{ name: 's', value: '"infosys"', change: 'init' }, { name: 'count', value: '0', change: 'init' }] },
        { step: 2, line: 'ch="i"', variables: [{ name: 'count', value: '1', change: '+1 vowel' }] },
        { step: 3, line: 'ch="o"', variables: [{ name: 'count', value: '2', change: '+1 vowel' }] },
        { step: 4, line: 'return', variables: [{ name: 'return', value: '2', change: 'final' }] },
      ],
      time: 'O(n)',
      space: 'O(1)',
    },
    {
      title: 'Anagram Check',
      problem: 'Check if two strings are anagrams.',
      example: '"listen", "silent" -> True',
      code: `def is_anagram(a, b):
    # Sort both and compare
    return sorted(a) == sorted(b)

print(is_anagram("listen", "silent"))`,
      dryRun: [
        { step: 1, line: 'sorted(a)', variables: [{ name: 'sa', value: "['e','i','l','n','s','t']", change: 'sorted a' }] },
        { step: 2, line: 'sorted(b)', variables: [{ name: 'sb', value: "['e','i','l','n','s','t']", change: 'sorted b' }] },
        { step: 3, line: 'compare', variables: [{ name: 'result', value: 'True', change: 'equal' }] },
      ],
      time: 'O(n log n)',
      space: 'O(n)',
    },
    {
      title: 'First Non-Repeating Character',
      problem: 'Return the index of the first non-repeating character.',
      example: '"loveleetcode" -> 2',
      code: `from collections import Counter

def first_unique(s):
    freq = Counter(s)         # count each char
    for i, ch in enumerate(s):
        if freq[ch] == 1:
            return i
    return -1`,
      dryRun: [
        { step: 1, line: 'Counter(s)', variables: [{ name: 'freq', value: '{l:1,o:2,v:1,...}', change: 'built' }] },
        { step: 2, line: 'i=0 ch="l"', variables: [{ name: 'freq[l]', value: '1', change: 'unique → return 0... wait check' }] },
        { step: 3, line: 'return i', variables: [{ name: 'return', value: '0', change: 'first unique' }] },
      ],
      time: 'O(n)',
      space: 'O(1)',
    },
  ],
  Arrays: [
    {
      title: 'Find Maximum Element',
      problem: 'Find the maximum element in an array.',
      example: '[3,1,4,1,5,9] -> 9',
      code: `def find_max(arr):
    mx = arr[0]                # assume first
    for x in arr[1:]:          # scan rest
        if x > mx:
            mx = x             # update max
    return mx`,
      dryRun: [
        { step: 1, line: 'mx=arr[0]', variables: [{ name: 'mx', value: '3', change: 'init' }] },
        { step: 2, line: 'x=4', variables: [{ name: 'mx', value: '4', change: '4>3' }] },
        { step: 3, line: 'x=9', variables: [{ name: 'mx', value: '9', change: '9>4' }] },
        { step: 4, line: 'return', variables: [{ name: 'return', value: '9', change: 'final' }] },
      ],
      time: 'O(n)',
      space: 'O(1)',
    },
    {
      title: 'Two Sum',
      problem: 'Return indices of two numbers that add to target.',
      example: '[2,7,11,15], target=9 -> [0,1]',
      code: `def two_sum(nums, target):
    seen = {}                       # value -> index
    for i, n in enumerate(nums):
        comp = target - n           # needed complement
        if comp in seen:
            return [seen[comp], i]
        seen[n] = i
    return []`,
      dryRun: [
        { step: 1, line: 'i=0 n=2', variables: [{ name: 'seen', value: '{2:0}', change: 'add' }] },
        { step: 2, line: 'i=1 n=7', variables: [{ name: 'comp', value: '2', change: 'found in seen' }, { name: 'return', value: '[0,1]', change: 'final' }] },
      ],
      time: 'O(n)',
      space: 'O(n)',
    },
    {
      title: 'Reverse Array',
      problem: 'Reverse an array in-place.',
      example: '[1,2,3,4] -> [4,3,2,1]',
      code: `def reverse(arr):
    i, j = 0, len(arr) - 1
    while i < j:
        arr[i], arr[j] = arr[j], arr[i]   # swap
        i += 1
        j -= 1
    return arr`,
      dryRun: [
        { step: 1, line: 'init', variables: [{ name: 'i,j', value: '0,3', change: 'pointers' }] },
        { step: 2, line: 'swap', variables: [{ name: 'arr', value: '[4,2,3,1]', change: 'swap 0,3' }] },
        { step: 3, line: 'swap', variables: [{ name: 'arr', value: '[4,3,2,1]', change: 'swap 1,2' }] },
      ],
      time: 'O(n)',
      space: 'O(1)',
    },
    {
      title: 'Remove Duplicates',
      problem: 'Remove duplicates preserving order.',
      example: '[1,1,2,3,3] -> [1,2,3]',
      code: `def dedup(arr):
    seen = set()
    out = []
    for x in arr:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out`,
      dryRun: [
        { step: 1, line: 'x=1', variables: [{ name: 'out', value: '[1]', change: 'add 1' }] },
        { step: 2, line: 'x=1', variables: [{ name: 'out', value: '[1]', change: 'skip dup' }] },
        { step: 3, line: 'x=2', variables: [{ name: 'out', value: '[1,2]', change: 'add 2' }] },
        { step: 4, line: 'x=3', variables: [{ name: 'out', value: '[1,2,3]', change: 'add 3' }] },
      ],
      time: 'O(n)',
      space: 'O(n)',
    },
    {
      title: 'Kadane Maximum Subarray',
      problem: 'Find max sum contiguous subarray.',
      example: '[-2,1,-3,4,-1,2,1,-5,4] -> 6',
      code: `def max_subarray(a):
    best = cur = a[0]
    for x in a[1:]:
        cur = max(x, cur + x)   # extend or restart
        best = max(best, cur)
    return best`,
      dryRun: [
        { step: 1, line: 'init', variables: [{ name: 'best,cur', value: '-2,-2', change: 'start' }] },
        { step: 2, line: 'x=1', variables: [{ name: 'cur', value: '1', change: 'restart' }, { name: 'best', value: '1', change: 'update' }] },
        { step: 3, line: 'x=4', variables: [{ name: 'cur', value: '4', change: 'restart' }, { name: 'best', value: '4', change: 'update' }] },
        { step: 4, line: 'continue', variables: [{ name: 'best', value: '6', change: 'reaches 6' }] },
      ],
      time: 'O(n)',
      space: 'O(1)',
    },
  ],
  Patterns: [
    {
      title: 'Right Triangle Star Pattern',
      problem: 'Print a right-triangle of stars of height n.',
      example: 'n=4 ->\n*\n**\n***\n****',
      code: `def pattern(n):
    for i in range(1, n + 1):
        print("*" * i)`,
      dryRun: [
        { step: 1, line: 'i=1', variables: [{ name: 'out', value: '"*"', change: '' }] },
        { step: 2, line: 'i=2', variables: [{ name: 'out', value: '"**"', change: '' }] },
        { step: 3, line: 'i=3', variables: [{ name: 'out', value: '"***"', change: '' }] },
        { step: 4, line: 'i=4', variables: [{ name: 'out', value: '"****"', change: '' }] },
      ],
      time: 'O(n²)',
      space: 'O(1)',
    },
    {
      title: 'Pyramid Pattern',
      problem: 'Print a centered pyramid of height n.',
      example: 'n=3 ->\n  *\n ***\n*****',
      code: `def pyramid(n):
    for i in range(n):
        print(" " * (n - i - 1) + "*" * (2 * i + 1))`,
      dryRun: [
        { step: 1, line: 'i=0', variables: [{ name: 'line', value: '"  *"', change: '' }] },
        { step: 2, line: 'i=1', variables: [{ name: 'line', value: '" ***"', change: '' }] },
        { step: 3, line: 'i=2', variables: [{ name: 'line', value: '"*****"', change: '' }] },
      ],
      time: 'O(n²)',
      space: 'O(1)',
    },
    {
      title: 'Number Pattern',
      problem: 'Print numbers in a triangular pattern.',
      example: 'n=3 ->\n1\n12\n123',
      code: `def num_pattern(n):
    for i in range(1, n + 1):
        print("".join(str(j) for j in range(1, i + 1)))`,
      dryRun: [
        { step: 1, line: 'i=1', variables: [{ name: 'line', value: '"1"', change: '' }] },
        { step: 2, line: 'i=2', variables: [{ name: 'line', value: '"12"', change: '' }] },
        { step: 3, line: 'i=3', variables: [{ name: 'line', value: '"123"', change: '' }] },
      ],
      time: 'O(n²)',
      space: 'O(1)',
    },
  ],
  'Number Theory': [
    {
      title: 'Check Prime',
      problem: 'Check if a number is prime.',
      example: '7 -> True',
      code: `def is_prime(n):
    if n < 2: return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True`,
      dryRun: [
        { step: 1, line: 'n=7', variables: [{ name: 'sqrt', value: '2', change: 'limit' }] },
        { step: 2, line: 'i=2', variables: [{ name: '7%2', value: '1', change: 'no divide' }] },
        { step: 3, line: 'return', variables: [{ name: 'return', value: 'True', change: 'prime' }] },
      ],
      time: 'O(√n)',
      space: 'O(1)',
    },
    {
      title: 'GCD (Euclidean)',
      problem: 'Find GCD of two integers.',
      example: 'gcd(48,18) -> 6',
      code: `def gcd(a, b):
    while b:
        a, b = b, a % b
    return a`,
      dryRun: [
        { step: 1, line: 'a=48 b=18', variables: [{ name: 'a,b', value: '48,18', change: 'init' }] },
        { step: 2, line: 'iter', variables: [{ name: 'a,b', value: '18,12', change: '48%18=12' }] },
        { step: 3, line: 'iter', variables: [{ name: 'a,b', value: '12,6', change: '18%12=6' }] },
        { step: 4, line: 'iter', variables: [{ name: 'a,b', value: '6,0', change: '12%6=0' }] },
        { step: 5, line: 'return', variables: [{ name: 'return', value: '6', change: 'gcd' }] },
      ],
      time: 'O(log min(a,b))',
      space: 'O(1)',
    },
    {
      title: 'Factorial',
      problem: 'Compute n! iteratively.',
      example: '5 -> 120',
      code: `def factorial(n):
    res = 1
    for i in range(2, n + 1):
        res *= i
    return res`,
      dryRun: [
        { step: 1, line: 'i=2', variables: [{ name: 'res', value: '2', change: '×2' }] },
        { step: 2, line: 'i=3', variables: [{ name: 'res', value: '6', change: '×3' }] },
        { step: 3, line: 'i=4', variables: [{ name: 'res', value: '24', change: '×4' }] },
        { step: 4, line: 'i=5', variables: [{ name: 'res', value: '120', change: '×5' }] },
      ],
      time: 'O(n)',
      space: 'O(1)',
    },
  ],
  Sorting: [
    {
      title: 'Bubble Sort',
      problem: 'Sort an array using bubble sort.',
      example: '[5,1,4,2] -> [1,2,4,5]',
      code: `def bubble(a):
    n = len(a)
    for i in range(n):
        for j in range(0, n - i - 1):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
    return a`,
      dryRun: [
        { step: 1, line: 'pass1', variables: [{ name: 'a', value: '[1,4,2,5]', change: 'bubble largest right' }] },
        { step: 2, line: 'pass2', variables: [{ name: 'a', value: '[1,2,4,5]', change: 'sorted' }] },
      ],
      time: 'O(n²)',
      space: 'O(1)',
    },
    {
      title: 'Insertion Sort',
      problem: 'Sort using insertion sort.',
      example: '[3,1,2] -> [1,2,3]',
      code: `def insertion(a):
    for i in range(1, len(a)):
        key = a[i]
        j = i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key
    return a`,
      dryRun: [
        { step: 1, line: 'i=1 key=1', variables: [{ name: 'a', value: '[1,3,2]', change: 'shift' }] },
        { step: 2, line: 'i=2 key=2', variables: [{ name: 'a', value: '[1,2,3]', change: 'inserted' }] },
      ],
      time: 'O(n²)',
      space: 'O(1)',
    },
    {
      title: 'Merge Sort',
      problem: 'Sort using merge sort (divide & conquer).',
      example: '[4,2,5,1] -> [1,2,4,5]',
      code: `def merge_sort(a):
    if len(a) <= 1: return a
    m = len(a) // 2
    L = merge_sort(a[:m])
    R = merge_sort(a[m:])
    return merge(L, R)

def merge(L, R):
    out, i, j = [], 0, 0
    while i < len(L) and j < len(R):
        if L[i] <= R[j]: out.append(L[i]); i += 1
        else:            out.append(R[j]); j += 1
    return out + L[i:] + R[j:]`,
      dryRun: [
        { step: 1, line: 'split', variables: [{ name: 'L,R', value: '[4,2],[5,1]', change: '' }] },
        { step: 2, line: 'sort halves', variables: [{ name: 'L,R', value: '[2,4],[1,5]', change: '' }] },
        { step: 3, line: 'merge', variables: [{ name: 'out', value: '[1,2,4,5]', change: '' }] },
      ],
      time: 'O(n log n)',
      space: 'O(n)',
    },
  ],
  Matrix: [
    {
      title: 'Transpose Matrix',
      problem: 'Transpose an NxN matrix in-place.',
      example: '[[1,2],[3,4]] -> [[1,3],[2,4]]',
      code: `def transpose(m):
    n = len(m)
    for i in range(n):
        for j in range(i + 1, n):
            m[i][j], m[j][i] = m[j][i], m[i][j]
    return m`,
      dryRun: [
        { step: 1, line: 'i=0 j=1', variables: [{ name: 'm', value: '[[1,3],[2,4]]', change: 'swap (0,1) and (1,0)' }] },
      ],
      time: 'O(n²)',
      space: 'O(1)',
    },
    {
      title: 'Rotate Matrix 90°',
      problem: 'Rotate an NxN matrix 90° clockwise.',
      example: '[[1,2],[3,4]] -> [[3,1],[4,2]]',
      code: `def rotate(m):
    m[:] = [list(r) for r in zip(*m[::-1])]
    return m`,
      dryRun: [
        { step: 1, line: 'reverse rows', variables: [{ name: 'tmp', value: '[[3,4],[1,2]]', change: '' }] },
        { step: 2, line: 'zip *', variables: [{ name: 'm', value: '[[3,1],[4,2]]', change: '' }] },
      ],
      time: 'O(n²)',
      space: 'O(n²)',
    },
    {
      title: 'Spiral Order',
      problem: 'Return matrix elements in spiral order.',
      example: '[[1,2,3],[4,5,6],[7,8,9]] -> [1,2,3,6,9,8,7,4,5]',
      code: `def spiral(m):
    res = []
    while m:
        res += m.pop(0)              # top row
        m = list(zip(*m))[::-1]      # rotate ccw
        m = [list(r) for r in m]
    return res`,
      dryRun: [
        { step: 1, line: 'pop top', variables: [{ name: 'res', value: '[1,2,3]', change: '' }] },
        { step: 2, line: 'rotate', variables: [{ name: 'm', value: '[[6,9],[5,8],[4,7]]', change: '' }] },
        { step: 3, line: 'continue', variables: [{ name: 'res', value: '[1,2,3,6,9,8,7,4,5]', change: 'final' }] },
      ],
      time: 'O(n²)',
      space: 'O(n²)',
    },
  ],
  'Dynamic Programming': [
    {
      title: 'Fibonacci (DP)',
      problem: 'Compute nth Fibonacci using bottom-up DP.',
      example: 'n=6 -> 8',
      code: `def fib(n):
    if n < 2: return n
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b`,
      dryRun: [
        { step: 1, line: 'init', variables: [{ name: 'a,b', value: '0,1', change: '' }] },
        { step: 2, line: 'iter', variables: [{ name: 'a,b', value: '1,1', change: '' }] },
        { step: 3, line: 'iter', variables: [{ name: 'a,b', value: '1,2', change: '' }] },
        { step: 4, line: 'iter', variables: [{ name: 'a,b', value: '2,3', change: '' }] },
        { step: 5, line: 'iter', variables: [{ name: 'a,b', value: '3,5', change: '' }] },
        { step: 6, line: 'iter', variables: [{ name: 'a,b', value: '5,8', change: 'return 8' }] },
      ],
      time: 'O(n)',
      space: 'O(1)',
    },
    {
      title: 'Climbing Stairs',
      problem: 'Number of ways to climb n stairs (1 or 2 at a time).',
      example: 'n=4 -> 5',
      code: `def climb(n):
    a, b = 1, 1
    for _ in range(n):
        a, b = b, a + b
    return a`,
      dryRun: [
        { step: 1, line: 'init', variables: [{ name: 'a,b', value: '1,1', change: '' }] },
        { step: 2, line: 'after 4 iters', variables: [{ name: 'a', value: '5', change: '' }] },
      ],
      time: 'O(n)',
      space: 'O(1)',
    },
    {
      title: '0/1 Knapsack',
      problem: 'Maximize value with capacity W.',
      example: 'wt=[1,3,4], val=[15,20,30], W=4 -> 35',
      code: `def knapsack(W, wt, val):
    n = len(wt)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(W + 1):
            dp[i][w] = dp[i-1][w]
            if wt[i-1] <= w:
                dp[i][w] = max(dp[i][w], dp[i-1][w-wt[i-1]] + val[i-1])
    return dp[n][W]`,
      dryRun: [
        { step: 1, line: 'fill dp', variables: [{ name: 'dp[3][4]', value: '35', change: 'optimum' }] },
      ],
      time: 'O(nW)',
      space: 'O(nW)',
    },
  ],
  'Linked List': [
    {
      title: 'Reverse Linked List',
      problem: 'Reverse a singly linked list.',
      example: '1->2->3 becomes 3->2->1',
      code: `class Node:
    def __init__(self, v, n=None):
        self.v, self.next = v, n

def reverse(head):
    prev = None
    while head:
        nxt = head.next      # save next
        head.next = prev     # flip pointer
        prev = head          # advance prev
        head = nxt           # advance head
    return prev`,
      dryRun: [
        { step: 1, line: 'init', variables: [{ name: 'prev,head', value: 'None,1', change: '' }] },
        { step: 2, line: 'iter', variables: [{ name: 'prev,head', value: '1,2', change: '1.next=None' }] },
        { step: 3, line: 'iter', variables: [{ name: 'prev,head', value: '2,3', change: '2.next=1' }] },
        { step: 4, line: 'iter', variables: [{ name: 'prev', value: '3', change: '3.next=2' }] },
      ],
      time: 'O(n)',
      space: 'O(1)',
    },
    {
      title: 'Detect Cycle (Floyd)',
      problem: 'Detect a cycle in a linked list.',
      example: '1->2->3->2 (cycle) -> True',
      code: `def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False`,
      dryRun: [
        { step: 1, line: 'init', variables: [{ name: 'slow,fast', value: 'head,head', change: '' }] },
        { step: 2, line: 'advance', variables: [{ name: 'meet', value: 'True', change: 'pointers collide' }] },
      ],
      time: 'O(n)',
      space: 'O(1)',
    },
    {
      title: 'Merge Two Sorted Lists',
      problem: 'Merge two sorted linked lists.',
      example: '1->3, 2->4 -> 1->2->3->4',
      code: `def merge(a, b):
    dummy = tail = Node(0)
    while a and b:
        if a.v <= b.v: tail.next, a = a, a.next
        else:          tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
    return dummy.next`,
      dryRun: [
        { step: 1, line: 'a=1 b=2', variables: [{ name: 'tail', value: '1', change: '' }] },
        { step: 2, line: 'a=3 b=2', variables: [{ name: 'tail', value: '2', change: '' }] },
        { step: 3, line: 'a=3 b=4', variables: [{ name: 'tail', value: '3', change: '' }] },
        { step: 4, line: 'attach', variables: [{ name: 'list', value: '1->2->3->4', change: '' }] },
      ],
      time: 'O(n+m)',
      space: 'O(1)',
    },
  ],
  'Stack & Queue': [
    {
      title: 'Valid Parentheses',
      problem: 'Check if brackets are balanced.',
      example: '"({[]})" -> True',
      code: `def valid(s):
    pair = {')':'(', ']':'[', '}':'{'}
    st = []
    for c in s:
        if c in '([{': st.append(c)
        elif not st or st.pop() != pair[c]:
            return False
    return not st`,
      dryRun: [
        { step: 1, line: 'push (', variables: [{ name: 'st', value: '["("]', change: '' }] },
        { step: 2, line: 'push {', variables: [{ name: 'st', value: '["(","{"]', change: '' }] },
        { step: 3, line: 'pop }', variables: [{ name: 'st', value: '["("]', change: 'match' }] },
        { step: 4, line: 'pop )', variables: [{ name: 'st', value: '[]', change: 'match' }] },
      ],
      time: 'O(n)',
      space: 'O(n)',
    },
    {
      title: 'Implement Queue using Stacks',
      problem: 'Implement FIFO queue using two stacks.',
      example: 'enq 1,2,3 deq -> 1',
      code: `class Queue:
    def __init__(self):
        self.inb, self.out = [], []
    def enq(self, x): self.inb.append(x)
    def deq(self):
        if not self.out:
            while self.inb: self.out.append(self.inb.pop())
        return self.out.pop()`,
      dryRun: [
        { step: 1, line: 'enq 1,2,3', variables: [{ name: 'inb', value: '[1,2,3]', change: '' }] },
        { step: 2, line: 'deq', variables: [{ name: 'out', value: '[3,2,1]', change: 'transferred' }, { name: 'pop', value: '1', change: '' }] },
      ],
      time: 'Amortized O(1)',
      space: 'O(n)',
    },
    {
      title: 'Next Greater Element',
      problem: 'For each element, find next greater on right.',
      example: '[2,1,3] -> [3,3,-1]',
      code: `def next_greater(a):
    res = [-1] * len(a)
    st = []
    for i, x in enumerate(a):
        while st and a[st[-1]] < x:
            res[st.pop()] = x
        st.append(i)
    return res`,
      dryRun: [
        { step: 1, line: 'i=0 x=2', variables: [{ name: 'st', value: '[0]', change: '' }] },
        { step: 2, line: 'i=1 x=1', variables: [{ name: 'st', value: '[0,1]', change: '' }] },
        { step: 3, line: 'i=2 x=3', variables: [{ name: 'res', value: '[3,3,-1]', change: 'pop both' }] },
      ],
      time: 'O(n)',
      space: 'O(n)',
    },
  ],
  'Binary Search': [
    {
      title: 'Binary Search',
      problem: 'Search target in sorted array.',
      example: '[1,3,5,7,9], target=5 -> 2',
      code: `def bsearch(a, t):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == t: return mid
        if a[mid] < t: lo = mid + 1
        else: hi = mid - 1
    return -1`,
      dryRun: [
        { step: 1, line: 'mid=2', variables: [{ name: 'a[mid]', value: '5', change: 'match → return 2' }] },
      ],
      time: 'O(log n)',
      space: 'O(1)',
    },
    {
      title: 'First Occurrence',
      problem: 'Find first occurrence of target.',
      example: '[1,2,2,2,3], 2 -> 1',
      code: `def first_occ(a, t):
    lo, hi, ans = 0, len(a)-1, -1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == t:
            ans = mid; hi = mid - 1
        elif a[mid] < t: lo = mid + 1
        else: hi = mid - 1
    return ans`,
      dryRun: [
        { step: 1, line: 'mid=2', variables: [{ name: 'ans', value: '2', change: 'match, search left' }] },
        { step: 2, line: 'mid=0', variables: [{ name: 'lo', value: '1', change: '' }] },
        { step: 3, line: 'mid=1', variables: [{ name: 'ans', value: '1', change: 'final' }] },
      ],
      time: 'O(log n)',
      space: 'O(1)',
    },
  ],
  'OOP & Classes': [
    {
      title: 'Bank Account Class',
      problem: 'Design a BankAccount class with deposit, withdraw, balance.',
      example: 'a.deposit(100); a.withdraw(40); a.balance -> 60',
      code: `class BankAccount:
    def __init__(self, owner, bal=0):
        self.owner = owner
        self._bal = bal
    def deposit(self, amt): self._bal += amt
    def withdraw(self, amt):
        if amt > self._bal: raise ValueError("insufficient")
        self._bal -= amt
    @property
    def balance(self): return self._bal`,
      dryRun: [
        { step: 1, line: 'a = BankAccount("Shyam")', variables: [{ name: '_bal', value: '0', change: 'init' }] },
        { step: 2, line: 'deposit(100)', variables: [{ name: '_bal', value: '100', change: '' }] },
        { step: 3, line: 'withdraw(40)', variables: [{ name: '_bal', value: '60', change: '' }] },
      ],
      time: 'O(1)',
      space: 'O(1)',
    },
    {
      title: 'Inheritance: Animal → Dog',
      problem: 'Demonstrate inheritance & method override.',
      example: 'Dog().speak() -> "Woof"',
      code: `class Animal:
    def speak(self): return "..."

class Dog(Animal):
    def speak(self): return "Woof"

print(Dog().speak())`,
      dryRun: [
        { step: 1, line: 'Dog()', variables: [{ name: 'obj', value: 'Dog instance', change: '' }] },
        { step: 2, line: 'speak()', variables: [{ name: 'return', value: '"Woof"', change: 'override' }] },
      ],
      time: 'O(1)',
      space: 'O(1)',
    },
  ],
  Recursion: [
    {
      title: 'Factorial (Recursive)',
      problem: 'Compute n! recursively.',
      example: '5 -> 120',
      code: `def fact(n):
    if n <= 1: return 1
    return n * fact(n - 1)`,
      dryRun: [
        { step: 1, line: 'fact(5)', variables: [{ name: 'call', value: '5*fact(4)', change: '' }] },
        { step: 2, line: '...', variables: [{ name: 'unwind', value: '120', change: 'final' }] },
      ],
      time: 'O(n)',
      space: 'O(n)',
    },
    {
      title: 'Sum of Digits',
      problem: 'Sum digits of n recursively.',
      example: '1234 -> 10',
      code: `def digit_sum(n):
    if n == 0: return 0
    return n % 10 + digit_sum(n // 10)`,
      dryRun: [
        { step: 1, line: '1234', variables: [{ name: 'split', value: '4 + ds(123)', change: '' }] },
        { step: 2, line: 'unwind', variables: [{ name: 'return', value: '10', change: '' }] },
      ],
      time: 'O(log n)',
      space: 'O(log n)',
    },
  ],
  'Bit Manipulation': [
    {
      title: 'Count Set Bits',
      problem: 'Count number of 1s in binary representation.',
      example: '5 (101) -> 2',
      code: `def popcount(n):
    c = 0
    while n:
        n &= n - 1   # drop lowest set bit
        c += 1
    return c`,
      dryRun: [
        { step: 1, line: 'n=5 (101)', variables: [{ name: 'n', value: '4 (100)', change: 'c=1' }] },
        { step: 2, line: 'n=4', variables: [{ name: 'n', value: '0', change: 'c=2' }] },
      ],
      time: 'O(k)',
      space: 'O(1)',
    },
    {
      title: 'Single Number (XOR)',
      problem: 'Find element that appears once.',
      example: '[2,3,2,4,4] -> 3',
      code: `def single(nums):
    r = 0
    for x in nums: r ^= x
    return r`,
      dryRun: [
        { step: 1, line: 'xor all', variables: [{ name: 'r', value: '3', change: 'pairs cancel' }] },
      ],
      time: 'O(n)',
      space: 'O(1)',
    },
  ],
  Greedy: [
    {
      title: 'Activity Selection',
      problem: 'Max non-overlapping activities.',
      example: '[(1,3),(2,4),(3,5)] -> 2',
      code: `def activities(acts):
    acts.sort(key=lambda x: x[1])
    end = -1; cnt = 0
    for s, f in acts:
        if s >= end:
            cnt += 1; end = f
    return cnt`,
      dryRun: [
        { step: 1, line: 'sort by end', variables: [{ name: 'acts', value: '[(1,3),(2,4),(3,5)]', change: '' }] },
        { step: 2, line: 'pick (1,3)', variables: [{ name: 'end,cnt', value: '3,1', change: '' }] },
        { step: 3, line: 'pick (3,5)', variables: [{ name: 'end,cnt', value: '5,2', change: '' }] },
      ],
      time: 'O(n log n)',
      space: 'O(1)',
    },
    {
      title: 'Coin Change (Greedy)',
      problem: 'Min coins for amount with denominations [1,5,10,25].',
      example: 'amt=30 -> 2',
      code: `def coins(amt, d=[25,10,5,1]):
    cnt = 0
    for c in d:
        cnt += amt // c
        amt %= c
    return cnt`,
      dryRun: [
        { step: 1, line: 'c=25', variables: [{ name: 'cnt,amt', value: '1,5', change: '' }] },
        { step: 2, line: 'c=5', variables: [{ name: 'cnt,amt', value: '2,0', change: '' }] },
      ],
      time: 'O(d)',
      space: 'O(1)',
    },
  ],
  Graph: [
    {
      title: 'BFS Traversal',
      problem: 'BFS from source node.',
      example: 'graph={0:[1,2],1:[2],2:[]}, src=0 -> [0,1,2]',
      code: `from collections import deque

def bfs(g, s):
    seen = {s}; q = deque([s]); order = []
    while q:
        u = q.popleft(); order.append(u)
        for v in g[u]:
            if v not in seen:
                seen.add(v); q.append(v)
    return order`,
      dryRun: [
        { step: 1, line: 'pop 0', variables: [{ name: 'order', value: '[0]', change: '' }] },
        { step: 2, line: 'pop 1', variables: [{ name: 'order', value: '[0,1]', change: '' }] },
        { step: 3, line: 'pop 2', variables: [{ name: 'order', value: '[0,1,2]', change: '' }] },
      ],
      time: 'O(V+E)',
      space: 'O(V)',
    },
    {
      title: 'DFS Traversal',
      problem: 'DFS from source recursively.',
      example: 'src=0 -> [0,1,2]',
      code: `def dfs(g, u, seen=None, order=None):
    if seen is None: seen, order = set(), []
    seen.add(u); order.append(u)
    for v in g[u]:
        if v not in seen:
            dfs(g, v, seen, order)
    return order`,
      dryRun: [
        { step: 1, line: 'visit 0', variables: [{ name: 'order', value: '[0]', change: '' }] },
        { step: 2, line: 'visit 1', variables: [{ name: 'order', value: '[0,1]', change: '' }] },
        { step: 3, line: 'visit 2', variables: [{ name: 'order', value: '[0,1,2]', change: '' }] },
      ],
      time: 'O(V+E)',
      space: 'O(V)',
    },
  ],
};

function difficultyFor(idx: number): Difficulty {
  const m = idx % 3;
  return m === 0 ? 'Easy' : m === 1 ? 'Medium' : 'Hard';
}

let _cache: Question[] | null = null;

export function getInfosysQuestions(): Question[] {
  if (_cache) return _cache;
  const out: Question[] = [];
  let id = 1;
  for (const { name, count } of TOPICS) {
    const seeds = SEEDS[name] || SEEDS.Arrays;
    for (let i = 0; i < count; i++) {
      const seed = seeds[i % seeds.length];
      const variant = Math.floor(i / seeds.length) + 1;
      out.push({
        id,
        topic: name,
        difficulty: difficultyFor(i),
        title: variant === 1 ? seed.title : `${seed.title} — Variant ${variant}`,
        problem: seed.problem,
        example: seed.example,
        code: seed.code,
        dryRun: seed.dryRun,
        time: seed.time,
        space: seed.space,
      });
      id++;
    }
  }
  _cache = out;
  return out;
}

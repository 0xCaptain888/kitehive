import { AgentBandit } from './bandit';

// Simple test runner
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

function runTests() {
  console.log('=== AgentBandit Tests ===\n');

  // Test 1: Basic agent selection
  {
    const bandit = new AgentBandit();
    bandit.addAgent('agent-a');
    bandit.addAgent('agent-b');

    const candidates = [
      { id: 'agent-a', quote: { price: 0.50, estimatedLatency: 5000, confidence: 0.8 }, completedTasks: 10 },
      { id: 'agent-b', quote: { price: 0.30, estimatedLatency: 8000, confidence: 0.6 }, completedTasks: 3 },
    ];

    const result = bandit.selectAgent(candidates, 1.0, 15);
    assert(result !== null, 'Should select an agent');
    assert(['agent-a', 'agent-b'].includes(result!.selected.id), 'Selected agent should be one of the candidates');
    assert(result!.qualitySample >= 0 && result!.qualitySample <= 1, 'Quality sample should be between 0 and 1');
    assert(result!.allSamples.length === 2, 'Should have samples for all candidates');
  }

  // Test 2: Budget constraint filtering
  {
    const bandit = new AgentBandit();
    bandit.addAgent('expensive');
    bandit.addAgent('cheap');

    const candidates = [
      { id: 'expensive', quote: { price: 5.00, estimatedLatency: 3000, confidence: 0.9 }, completedTasks: 20 },
      { id: 'cheap', quote: { price: 0.10, estimatedLatency: 5000, confidence: 0.5 }, completedTasks: 2 },
    ];

    const result = bandit.selectAgent(candidates, 0.50, 15);
    assert(result !== null, 'Should find an agent within budget');
    assert(result!.selected.id === 'cheap', 'Should select the only affordable agent');
  }

  // Test 3: Deadline constraint filtering
  {
    const bandit = new AgentBandit();
    bandit.addAgent('slow');
    bandit.addAgent('fast');

    const candidates = [
      { id: 'slow', quote: { price: 0.30, estimatedLatency: 20000, confidence: 0.7 }, completedTasks: 5 },
      { id: 'fast', quote: { price: 0.50, estimatedLatency: 3000, confidence: 0.8 }, completedTasks: 8 },
    ];

    const result = bandit.selectAgent(candidates, 1.0, 5);
    assert(result !== null, 'Should find an agent within deadline');
    assert(result!.selected.id === 'fast', 'Should select the only agent meeting deadline');
  }

  // Test 4: No eligible agents
  {
    const bandit = new AgentBandit();
    const candidates = [
      { id: 'too-expensive', quote: { price: 10.0, estimatedLatency: 3000, confidence: 0.9 }, completedTasks: 5 },
    ];
    const result = bandit.selectAgent(candidates, 1.0, 15);
    assert(result === null, 'Should return null when no agents within budget');
  }

  // Test 5: Update shifts selection probability
  {
    const bandit = new AgentBandit();
    bandit.addAgent('good-agent');
    bandit.addAgent('bad-agent');

    // Simulate good-agent succeeding many times
    for (let i = 0; i < 20; i++) bandit.update('good-agent', 5);
    // Simulate bad-agent failing many times
    for (let i = 0; i < 20; i++) bandit.update('bad-agent', 1);

    const stats = bandit.getAllStats();
    const goodStats = stats.get('good-agent')!;
    const badStats = stats.get('bad-agent')!;

    assert(goodStats.expectedQuality > badStats.expectedQuality,
      'Good agent should have higher expected quality after updates');
    assert(goodStats.alpha > goodStats.beta, 'Good agent should have more successes');
    assert(badStats.beta > badStats.alpha, 'Bad agent should have more failures');
  }

  // Test 6: Exploration boost
  {
    const bandit = new AgentBandit();
    bandit.addAgent('established', 20, 3);
    bandit.addAgent('newcomer', 1, 1);

    const newcomerStats = bandit.getStats('newcomer')!;
    const establishedStats = bandit.getStats('established')!;

    const newcomerUncertainty = 1 / Math.sqrt(newcomerStats.alpha + newcomerStats.beta);
    const establishedUncertainty = 1 / Math.sqrt(establishedStats.alpha + establishedStats.beta);

    assert(newcomerUncertainty > establishedUncertainty,
      'Newcomer should have higher exploration bonus (more uncertainty)');
  }

  console.log('\n=== All tests passed! ===');
}

runTests();

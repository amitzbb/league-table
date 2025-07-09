import { useState, useEffect } from 'react';
import './App.css';

const defaultPlayers = [
  'Eli',
  'Amit',
  'Idan',
  'Alon',
  'Mor',
];

function getInitialTable(players) {
  return players.map((name) => ({
    name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
  }));
}

function calculateTable(players, results, gameMode) {
  const table = getInitialTable(players);
  
  results.forEach((result) => {
    if (gameMode === '1v1') {
      // Original 1v1 logic
      const { home, away, homeGoals, awayGoals } = result;
      const homeIdx = table.findIndex((p) => p.name === home);
      const awayIdx = table.findIndex((p) => p.name === away);
      if (homeIdx === -1 || awayIdx === -1) return;
      
      table[homeIdx].played++;
      table[awayIdx].played++;
      table[homeIdx].gf += homeGoals;
      table[homeIdx].ga += awayGoals;
      table[awayIdx].gf += awayGoals;
      table[awayIdx].ga += homeGoals;
      
      if (homeGoals > awayGoals) {
        table[homeIdx].won++;
        table[awayIdx].lost++;
        table[homeIdx].points += 3;
      } else if (homeGoals < awayGoals) {
        table[awayIdx].won++;
        table[homeIdx].lost++;
        table[awayIdx].points += 3;
      } else {
        table[homeIdx].drawn++;
        table[awayIdx].drawn++;
        table[homeIdx].points++;
        table[awayIdx].points++;
      }
    } else {
      // 2v2 logic
      const { teamA, teamB, teamAGoals, teamBGoals } = result;
      const teamAPlayers = teamA.split(',').map(p => p.trim());
      const teamBPlayers = teamB.split(',').map(p => p.trim());
      
      // Update stats for all players
      [...teamAPlayers, ...teamBPlayers].forEach(playerName => {
        const playerIdx = table.findIndex((p) => p.name === playerName);
        if (playerIdx !== -1) {
          table[playerIdx].played++;
        }
      });
      
      // Calculate individual stats based on team result
      if (teamAGoals > teamBGoals) {
        // Team A wins
        teamAPlayers.forEach(playerName => {
          const playerIdx = table.findIndex((p) => p.name === playerName);
          if (playerIdx !== -1) {
            table[playerIdx].won++;
            table[playerIdx].points += 3;
            table[playerIdx].gf += teamAGoals;
            table[playerIdx].ga += teamBGoals;
          }
        });
        teamBPlayers.forEach(playerName => {
          const playerIdx = table.findIndex((p) => p.name === playerName);
          if (playerIdx !== -1) {
            table[playerIdx].lost++;
            table[playerIdx].gf += teamBGoals;
            table[playerIdx].ga += teamAGoals;
          }
        });
      } else if (teamAGoals < teamBGoals) {
        // Team B wins
        teamBPlayers.forEach(playerName => {
          const playerIdx = table.findIndex((p) => p.name === playerName);
          if (playerIdx !== -1) {
            table[playerIdx].won++;
            table[playerIdx].points += 3;
            table[playerIdx].gf += teamBGoals;
            table[playerIdx].ga += teamAGoals;
          }
        });
        teamAPlayers.forEach(playerName => {
          const playerIdx = table.findIndex((p) => p.name === playerName);
          if (playerIdx !== -1) {
            table[playerIdx].lost++;
            table[playerIdx].gf += teamAGoals;
            table[playerIdx].ga += teamBGoals;
          }
        });
      } else {
        // Draw
        [...teamAPlayers, ...teamBPlayers].forEach(playerName => {
          const playerIdx = table.findIndex((p) => p.name === playerName);
          if (playerIdx !== -1) {
            table[playerIdx].drawn++;
            table[playerIdx].points++;
            if (teamAPlayers.includes(playerName)) {
              table[playerIdx].gf += teamAGoals;
              table[playerIdx].ga += teamBGoals;
            } else {
              table[playerIdx].gf += teamBGoals;
              table[playerIdx].ga += teamAGoals;
            }
          }
        });
      }
    }
  });
  
  return table.sort((a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf);
}

function get1v1Schedule(players) {
  const schedule = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      schedule.push({ home: players[i], away: players[j] });
    }
  }
  return schedule;
}
function get2v2Schedule(players, rounds = 1) {
  // All unique sets of 4 players, all unique 2v2 splits
  const comb = (arr, k) => arr.length < k ? [] : k === 0 ? [[]] : arr.flatMap((v, i) => comb(arr.slice(i + 1), k - 1).map(t => [v, ...t]));
  const teamComb = (arr) => {
    if (arr.length !== 4) return [];
    return [
      [[arr[0], arr[1]], [arr[2], arr[3]]],
      [[arr[0], arr[2]], [arr[1], arr[3]]],
      [[arr[0], arr[3]], [arr[1], arr[2]]],
    ];
  };
  const schedule = [];
  if (players.length === 4) {
    for (let r = 0; r < rounds; r++) {
      teamComb(players).forEach(([teamA, teamB]) => {
        schedule.push({ teamA, teamB, sitting: [] });
      });
    }
  } else {
    const setsOf4 = comb(players, 4);
    setsOf4.forEach(set => {
      teamComb(set).forEach(([teamA, teamB]) => {
        const sitting = players.filter(p => !set.includes(p));
        schedule.push({ teamA, teamB, sitting });
      });
    });
  }
  return schedule;
}

function App() {
  // Load from localStorage if available
  const getInitialPlayers = () => {
    const stored = localStorage.getItem('leagueTablePlayers');
    return stored ? JSON.parse(stored) : [...defaultPlayers];
  };
  const getInitialResults = () => {
    const stored = localStorage.getItem('leagueTableResults');
    return stored ? JSON.parse(stored) : [];
  };
  const getInitialMode = () => {
    const stored = localStorage.getItem('leagueTableMode');
    return stored ? stored : '2v2';
  };

  const [playerNames, setPlayerNames] = useState(getInitialPlayers());
  const [results, setResults] = useState(getInitialResults());
  const [gameMode, setGameMode] = useState(getInitialMode());
  const [form, setForm] = useState({ 
    home: defaultPlayers[0], 
    away: defaultPlayers[1], 
    homeGoals: '', 
    awayGoals: '',
    teamA1: '',
    teamA2: '',
    teamB1: '',
    teamB2: '',
    teamAGoals: '',
    teamBGoals: '',
    note: ''
  });
  const [editIndex, setEditIndex] = useState(null);
  const [error, setError] = useState('');
  const [statsPlayer, setStatsPlayer] = useState(null); // Player for stats modal
  const [schedule, setSchedule] = useState([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [editingScheduleIdx, setEditingScheduleIdx] = useState(null);
  const [editingFields, setEditingFields] = useState({});
  const [numRounds, setNumRounds] = useState(1);

  const table = calculateTable(playerNames, results, gameMode);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('leagueTablePlayers', JSON.stringify(playerNames));
  }, [playerNames]);
  useEffect(() => {
    localStorage.setItem('leagueTableResults', JSON.stringify(results));
  }, [results]);
  useEffect(() => {
    localStorage.setItem('leagueTableMode', gameMode);
  }, [gameMode]);

  // Helper to get all matches for a player
  const getPlayerMatches = (player) => {
    return results.filter(r => {
      if (gameMode === '1v1') {
        return r.home === player || r.away === player;
      } else {
        const teamA = r.teamA.split(',').map(p => p.trim());
        const teamB = r.teamB.split(',').map(p => p.trim());
        return teamA.includes(player) || teamB.includes(player) || r.sittingPlayer === player;
      }
    });
  };

  // Helper to get stats for a player
  const getPlayerStats = (player) => {
    let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0, points = 0;
    getPlayerMatches(player).forEach(r => {
      if (gameMode === '1v1') {
        let isHome = r.home === player;
        let goalsFor = isHome ? r.homeGoals : r.awayGoals;
        let goalsAgainst = isHome ? r.awayGoals : r.homeGoals;
        played++;
        gf += goalsFor;
        ga += goalsAgainst;
        if (r.homeGoals === r.awayGoals) { drawn++; points++; }
        else if ((isHome && r.homeGoals > r.awayGoals) || (!isHome && r.awayGoals > r.homeGoals)) { won++; points += 3; }
        else { lost++; }
      } else {
        if (r.sittingPlayer === player) return;
        const teamA = r.teamA.split(',').map(p => p.trim());
        const isTeamA = teamA.includes(player);
        const goalsFor = isTeamA ? r.teamAGoals : r.teamBGoals;
        const goalsAgainst = isTeamA ? r.teamBGoals : r.teamAGoals;
        played++;
        gf += goalsFor;
        ga += goalsAgainst;
        if (r.teamAGoals === r.teamBGoals) { drawn++; points++; }
        else if ((isTeamA && r.teamAGoals > r.teamBGoals) || (!isTeamA && r.teamBGoals > r.teamAGoals)) { won++; points += 3; }
        else { lost++; }
      }
    });
    return { played, won, drawn, lost, gf, ga, gd: gf - ga, points };
  };

  const handleNameChange = (idx, value) => {
    setPlayerNames((prev) => {
      const updated = [...prev];
      updated[idx] = value;
      return updated;
    });
    setResults([]);
    setForm({ 
      home: '', 
      away: '', 
      homeGoals: '', 
      awayGoals: '',
      teamA1: '',
      teamA2: '',
      teamB1: '',
      teamB2: '',
      teamAGoals: '',
      teamBGoals: '',
      note: ''
    });
    setEditIndex(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (gameMode === '1v1') {
      if (form.home === form.away) {
        setError('Home and Away players cannot be the same!');
        return;
      }
      if (form.homeGoals === '' || form.awayGoals === '' || isNaN(form.homeGoals) || isNaN(form.awayGoals)) {
        setError('Please enter valid scores for both teams!');
        return;
      }
    } else {
      // 2v2 validation
      const teamAPlayers = [form.teamA1, form.teamA2].filter(Boolean);
      const teamBPlayers = [form.teamB1, form.teamB2].filter(Boolean);
      const allSelected = [...teamAPlayers, ...teamBPlayers];
      const sittingPlayers = playerNames.filter(p => !allSelected.includes(p));
      if (teamAPlayers.length !== 2 || teamBPlayers.length !== 2) {
        setError('Each team must have exactly 2 players!');
        return;
      }
      if (new Set(allSelected).size !== 4) {
        setError('Each player can only be selected once!');
        return;
      }
      if (playerNames.length > 4 && sittingPlayers.length < 1) {
        setError('There must be at least one sitting player!');
        return;
      }
      if (form.teamAGoals === '' || form.teamBGoals === '' || isNaN(form.teamAGoals) || isNaN(form.teamBGoals)) {
        setError('Please enter valid scores for both teams!');
        return;
      }
    }

    if (editIndex !== null) {
      setResults((r) =>
        r.map((item, idx) =>
          idx === editIndex
            ? (gameMode === '1v1' 
                ? { home: form.home, away: form.away, homeGoals: Number(form.homeGoals), awayGoals: Number(form.awayGoals), note: form.note }
                : { teamA: [form.teamA1, form.teamA2].join(', '), teamB: [form.teamB1, form.teamB2].join(', '), teamAGoals: Number(form.teamAGoals), teamBGoals: Number(form.teamBGoals), sittingPlayer: playerNames.length > 4 ? playerNames.filter(p => ![form.teamA1, form.teamA2, form.teamB1, form.teamB2].includes(p)).join(', ') : '', note: form.note }
              )
            : item
        )
      );
      setEditIndex(null);
    } else {
      setResults((r) => [
        ...r,
        gameMode === '1v1' 
          ? { home: form.home, away: form.away, homeGoals: Number(form.homeGoals), awayGoals: Number(form.awayGoals), note: form.note }
          : { teamA: [form.teamA1, form.teamA2].join(', '), teamB: [form.teamB1, form.teamB2].join(', '), teamAGoals: Number(form.teamAGoals), teamBGoals: Number(form.teamBGoals), sittingPlayer: playerNames.length > 4 ? playerNames.filter(p => ![form.teamA1, form.teamA2, form.teamB1, form.teamB2].includes(p)).join(', ') : '', note: form.note }
      ]);
    }
    
    setForm({ home: playerNames[0], away: playerNames[1], homeGoals: '', awayGoals: '', teamA1: '', teamA2: '', teamB1: '', teamB2: '', teamAGoals: '', teamBGoals: '', note: '' });
    setError('');
  };

  const handleDelete = (idx) => {
    setResults((r) => r.filter((_, i) => i !== idx));
    if (editIndex === idx) {
      setEditIndex(null);
      setForm({ home: playerNames[0], away: playerNames[1], homeGoals: '', awayGoals: '', teamA1: '', teamA2: '', teamB1: '', teamB2: '', teamAGoals: '', teamBGoals: '', note: '' });
    }
    setError('');
  };

  const handleEdit = (idx) => {
    const r = results[idx];
    if (gameMode === '1v1') {
      setForm({
        home: r.home,
        away: r.away,
        homeGoals: r.homeGoals,
        awayGoals: r.awayGoals,
        teamA1: '',
        teamA2: '',
        teamB1: '',
        teamB2: '',
        teamAGoals: '',
        teamBGoals: '',
        note: r.note
      });
    } else {
      const teamA = r.teamA.split(',').map(p => p.trim());
      const teamB = r.teamB.split(',').map(p => p.trim());
      setForm({
        home: '',
        away: '',
        homeGoals: '',
        awayGoals: '',
        teamA1: teamA[0] || '',
        teamA2: teamA[1] || '',
        teamB1: teamB[0] || '',
        teamB2: teamB[1] || '',
        teamAGoals: r.teamAGoals,
        teamBGoals: r.teamBGoals,
        note: r.note
      });
    }
    setEditIndex(idx);
    setError('');
  };

  // Add/remove player handlers
  const handleAddPlayer = () => {
    setPlayerNames((prev) => [...prev, `Player ${prev.length + 1}`]);
  };
  const handleRemovePlayer = (idx) => {
    const nameToRemove = playerNames[idx];
    setPlayerNames((prev) => prev.filter((_, i) => i !== idx));
    setResults((prev) => prev.filter(r => {
      if (gameMode === '1v1') {
        return r.home !== nameToRemove && r.away !== nameToRemove;
      } else {
        const teamA = r.teamA.split(',').map(p => p.trim());
        const teamB = r.teamB.split(',').map(p => p.trim());
        return !teamA.includes(nameToRemove) && !teamB.includes(nameToRemove) && r.sittingPlayer !== nameToRemove;
      }
    }));
    // Reset form if it referenced the removed player
    setForm(f => {
      const fields = ['home', 'away', 'teamA1', 'teamA2', 'teamB1', 'teamB2', 'sittingPlayer'];
      let changed = false;
      const newForm = { ...f };
      fields.forEach(field => {
        if (f[field] === nameToRemove) {
          newForm[field] = '';
          changed = true;
        }
      });
      return changed ? newForm : f;
    });
  };

  const handleGenerateSchedule = () => {
    if (gameMode === '1v1') {
      setSchedule(get1v1Schedule(playerNames));
    } else {
      setSchedule(get2v2Schedule(playerNames, playerNames.length === 4 ? numRounds : 1));
    }
    setShowSchedule(true);
  };

  // Helper to check if a scheduled game is completed
  const isGameCompleted = (game) => {
    if (gameMode === '1v1') {
      return results.some(r => r.home === game.home && r.away === game.away);
    } else {
      const a = game.teamA.join(', '), b = game.teamB.join(', '), s = game.sitting.join(', ');
      return results.some(r => r.teamA === a && r.teamB === b && (r.sittingPlayer || '') === s);
    }
  };

  return (
    <div className="container">
      <h1>League Table</h1>
      
      <div className="game-mode-toggle">
        <button
          style={{ 
            margin: '8px', 
            padding: '8px 16px', 
            background: gameMode === '1v1' ? '#007bff' : '#ccc', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 4, 
            cursor: 'pointer' 
          }}
          onClick={() => setGameMode('1v1')}
        >
          1v1 Mode
        </button>
        <button
          style={{ 
            margin: '8px', 
            padding: '8px 16px', 
            background: gameMode === '2v2' ? '#007bff' : '#ccc', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 4, 
            cursor: 'pointer' 
          }}
          onClick={() => setGameMode('2v2')}
        >
          2v2 Mode
        </button>
      </div>

      <div className="player-names-edit">
        <h2>Edit Player Names</h2>
        <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {playerNames.map((name, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="text"
                value={name}
                onChange={e => handleNameChange(idx, e.target.value)}
                placeholder={`Player ${idx + 1}`}
                maxLength={20}
                style={{ marginRight: 4, marginBottom: 8 }}
              />
              <button
                type="button"
                onClick={() => handleRemovePlayer(idx)}
                disabled={playerNames.length <= 2}
                style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, cursor: playerNames.length > 2 ? 'pointer' : 'not-allowed', padding: '2px 8px', marginBottom: 8 }}
                title="Remove Player"
              >
                🗑️
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddPlayer}
            style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '2px 12px', height: 32, marginBottom: 8 }}
          >
            + Add Player
          </button>
        </form>
      </div>

      {gameMode === '1v1' ? (
        <form className="match-form" onSubmit={handleSubmit}>
          <label>
            Home:
            <select name="home" value={form.home} onChange={handleChange}>
              {playerNames.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <input
            type="number"
            name="homeGoals"
            min="0"
            value={form.homeGoals}
            onChange={handleChange}
            placeholder="Home Goals"
            required
          />
          <span>vs</span>
          <label>
            Away:
            <select name="away" value={form.away} onChange={handleChange}>
              {playerNames.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <input
            type="number"
            name="awayGoals"
            min="0"
            value={form.awayGoals}
            onChange={handleChange}
            placeholder="Away Goals"
            required
          />
          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            placeholder="Add a note (optional)"
            style={{ width: '100%', minHeight: 40, margin: '8px 0' }}
          />
          <button type="submit">{editIndex !== null ? 'Save Edit' : 'Add Result'}</button>
          {editIndex !== null && (
            <button
              type="button"
              style={{ marginLeft: 8, background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}
              onClick={() => {
                setEditIndex(null);
                setForm({ home: playerNames[0], away: playerNames[1], homeGoals: '', awayGoals: '', teamA1: '', teamA2: '', teamB1: '', teamB2: '', teamAGoals: '', teamBGoals: '', note: '' });
                setError('');
              }}
            >
              Cancel Edit
            </button>
          )}
        </form>
      ) : (
        <form className="match-form" onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ minWidth: '200px', textAlign: 'left' }}>Team A Player 1:</label>
              <select name="teamA1" value={form.teamA1 || ''} onChange={handleChange} style={{ width: '200px' }}>
                <option value="">Select Player</option>
                {playerNames.filter(p => ![form.teamA2, form.teamB1, form.teamB2].includes(p)).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ minWidth: '200px', textAlign: 'left' }}>Team A Player 2:</label>
              <select name="teamA2" value={form.teamA2 || ''} onChange={handleChange} style={{ width: '200px' }}>
                <option value="">Select Player</option>
                {playerNames.filter(p => ![form.teamA1, form.teamB1, form.teamB2].includes(p)).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ minWidth: '200px', textAlign: 'left' }}>Team A Goals:</label>
              <input type="number" name="teamAGoals" min="0" value={form.teamAGoals} onChange={handleChange} placeholder="Team A Goals" required style={{ width: '100px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ minWidth: '200px', textAlign: 'center', fontWeight: 'bold' }}>vs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ minWidth: '200px', textAlign: 'left' }}>Team B Player 1:</label>
              <select name="teamB1" value={form.teamB1 || ''} onChange={handleChange} style={{ width: '200px' }}>
                <option value="">Select Player</option>
                {playerNames.filter(p => ![form.teamA1, form.teamA2, form.teamB2].includes(p)).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ minWidth: '200px', textAlign: 'left' }}>Team B Player 2:</label>
              <select name="teamB2" value={form.teamB2 || ''} onChange={handleChange} style={{ width: '200px' }}>
                <option value="">Select Player</option>
                {playerNames.filter(p => ![form.teamA1, form.teamA2, form.teamB1].includes(p)).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ minWidth: '200px', textAlign: 'left' }}>Team B Goals:</label>
              <input type="number" name="teamBGoals" min="0" value={form.teamBGoals} onChange={handleChange} placeholder="Team B Goals" required style={{ width: '100px' }} />
            </div>
            {playerNames.length > 4 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ minWidth: '200px', textAlign: 'left', fontWeight: 'bold' }}>Sitting Player{playerNames.length > 5 ? 's' : ''}:</label>
                <span style={{ width: '200px', fontWeight: 'bold' }}>
                  {playerNames.filter(p => ![form.teamA1, form.teamA2, form.teamB1, form.teamB2].includes(p)).join(', ') || '-'}
                </span>
              </div>
            )}
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              placeholder="Add a note (optional)"
              style={{ width: '100%', minHeight: 40, margin: '8px 0' }}
            />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button type="submit">{editIndex !== null ? 'Save Edit' : 'Add Result'}</button>
            {editIndex !== null && (
              <button
                type="button"
                style={{ marginLeft: 8, background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}
                onClick={() => {
                  setEditIndex(null);
                  setForm({ home: '', away: '', homeGoals: '', awayGoals: '', teamA1: '', teamA2: '', teamB1: '', teamB2: '', teamAGoals: '', teamBGoals: '', note: '' });
                  setError('');
                }}
              >
                Cancel Edit
              </button>
            )}
            <button
              type="button"
              style={{ background: '#888', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}
              onClick={() => {
                setForm(f => ({ ...f, teamA1: '', teamA2: '', teamB1: '', teamB2: '', teamAGoals: '', teamBGoals: '', note: '' }));
                setError('');
              }}
            >
              Clear Selections
            </button>
          </div>
        </form>
      )}

      {error && (
        <div style={{ color: '#dc3545', margin: '8px 0', fontWeight: 'bold' }}>
          {error}
        </div>
      )}

      <button
        style={{ margin: '16px 0', padding: '8px 16px', background: '#888', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        onClick={() => setResults([])}
      >
        Clear Results
      </button>

      <table className="league-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Pl</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GF</th>
            <th>GA</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            // Find top and bottom stats
            const getRowKey = row => `${row.points}|${row.gf - row.ga}|${row.gf}`;
            const firstStats = table.length > 0 ? getRowKey(table[0]) : null;
            const lastStats = table.length > 0 ? getRowKey(table[table.length - 1]) : null;
            return table.map((row) => {
              const rowKey = getRowKey(row);
              let rowClass = '';
              if (rowKey === firstStats) rowClass = 'first-place';
              if (rowKey === lastStats) rowClass = 'last-place';
              return (
                <tr key={row.name} className={rowClass}>
                  <td>
                    <button className="player-link" style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline', padding: 0 }} onClick={() => setStatsPlayer(row.name)}>{row.name}</button>
                  </td>
                  <td>{row.played}</td>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td>{row.gf}</td>
                  <td>{row.ga}</td>
                  <td>{row.gf - row.ga}</td>
                  <td>{row.points}</td>
                </tr>
              );
            });
          })()}
        </tbody>
      </table>

      {/* Player Stats Modal */}
      {statsPlayer && (
        <div className="modal-overlay" onClick={() => setStatsPlayer(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{statsPlayer} - Statistics</h2>
            {(() => {
              const stats = getPlayerStats(statsPlayer);
              return (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li>Played: <b>{stats.played}</b></li>
                  <li>Won: <b>{stats.won}</b></li>
                  <li>Drawn: <b>{stats.drawn}</b></li>
                  <li>Lost: <b>{stats.lost}</b></li>
                  <li>Goals For: <b>{stats.gf}</b></li>
                  <li>Goals Against: <b>{stats.ga}</b></li>
                  <li>Goal Difference: <b>{stats.gd}</b></li>
                  <li>Points: <b>{stats.points}</b></li>
                </ul>
              );
            })()}
            <h3>Match History</h3>
            <ul style={{ maxHeight: 200, overflowY: 'auto', padding: 0 }}>
              {getPlayerMatches(statsPlayer).map((r, i) => (
                <li key={i} style={{ marginBottom: 8, borderBottom: '1px solid #eee', paddingBottom: 4 }}>
                  {gameMode === '1v1'
                    ? `${r.home} ${r.homeGoals} - ${r.awayGoals} ${r.away}`
                    : `Team A (${r.teamA}) ${r.teamAGoals} - ${r.teamBGoals} Team B (${r.teamB}) [Sitting: ${r.sittingPlayer}]`}
                  {r.note && <div style={{ fontStyle: 'italic', color: '#888' }}>{r.note}</div>}
                </li>
              ))}
            </ul>
            <button style={{ marginTop: 16 }} onClick={() => setStatsPlayer(null)}>Close</button>
          </div>
        </div>
      )}

      <h2>Results</h2>
      <ul>
        {results.map((r, i) => {
          let resultContent;
          let teamAWin = false, teamBWin = false, draw = false;
          if (gameMode === '1v1') {
            if (r.homeGoals > r.awayGoals) teamAWin = true;
            else if (r.homeGoals < r.awayGoals) teamBWin = true;
            else draw = true;
            resultContent = (
              <>
                <span className={teamAWin ? 'winner' : draw ? 'draw' : ''}>{r.home} {r.homeGoals}</span>
                {' - '}
                <span className={teamBWin ? 'winner' : draw ? 'draw' : ''}>{r.awayGoals} {r.away}</span>
              </>
            );
          } else {
            if (r.teamAGoals > r.teamBGoals) teamAWin = true;
            else if (r.teamAGoals < r.teamBGoals) teamBWin = true;
            else draw = true;
            resultContent = (
              <>
                Team A (<span className={teamAWin ? 'winner' : draw ? 'draw' : ''}>{r.teamA}</span>)
                {' '}
                <span className={teamAWin ? 'winner' : draw ? 'draw' : ''}>{r.teamAGoals}</span>
                {' - '}
                <span className={teamBWin ? 'winner' : draw ? 'draw' : ''}>{r.teamBGoals}</span>
                {' '}
                Team B (<span className={teamBWin ? 'winner' : draw ? 'draw' : ''}>{r.teamB}</span>)
                {' [Sitting: '}{r.sittingPlayer}{']'}
              </>
            );
          }
          return (
            <li key={i} style={{ marginBottom: 4 }}>
              {resultContent}
              {r.note && (
                <div style={{ fontStyle: 'italic', color: '#888', marginTop: 2 }}>{r.note}</div>
              )}
              <button
                style={{ marginLeft: 8, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}
                onClick={() => handleDelete(i)}
                title="Delete"
              >
                🗑️
              </button>
              <button
                style={{ marginLeft: 4, background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}
                onClick={() => handleEdit(i)}
                title="Edit"
              >
                ✏️
              </button>
            </li>
          );
        })}
      </ul>

      <div style={{ margin: '16px 0', display: 'flex', gap: '8px' }}>
        <button onClick={handleGenerateSchedule} style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>
          Generate Schedule
        </button>
        <button onClick={() => { setSchedule([]); setShowSchedule(false); }} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>
          Clear Schedule
        </button>
      </div>
      {showSchedule && (
        <div className="schedule-section">
          <h2>Schedule</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {schedule.map((game, idx) => {
              const completedIdx = results.findIndex(r =>
                gameMode === '1v1'
                  ? r.home === game.home && r.away === game.away
                  : r.teamA === game.teamA.join(', ') && r.teamB === game.teamB.join(', ') && (r.sittingPlayer || '') === game.sitting.join(', ')
              );
              const isCompleted = completedIdx !== -1;
              const isEditing = editingScheduleIdx === idx;
              const result = isCompleted ? results[completedIdx] : null;
              return (
                <li key={idx} style={{ marginBottom: 12, background: isCompleted ? '#225d2a' : '#333', color: '#fff', borderRadius: 4, padding: 8 }}>
                  {gameMode === '1v1' ? (
                    <>
                      <b>{game.home}</b> vs <b>{game.away}</b>
                    </>
                  ) : (
                    <>
                      <b>Team A:</b> {game.teamA.join(', ')} vs <b>Team B:</b> {game.teamB.join(', ')}
                      {game.sitting.length > 0 && <span> [Sitting: {game.sitting.join(', ')}]</span>}
                    </>
                  )}
                  {!isCompleted && !isEditing && (
                    <div style={{ marginTop: 4 }}>
                      {gameMode === '1v1' ? (
                        <>
                          <input type="number" min="0" placeholder="Home Goals" style={{ width: 60 }} id={`h${idx}`} />
                          <input type="number" min="0" placeholder="Away Goals" style={{ width: 60, marginLeft: 4 }} id={`a${idx}`} />
                          <input type="text" placeholder="Note (optional)" style={{ width: 120, marginLeft: 4 }} id={`n${idx}`} />
                          <button style={{ marginLeft: 4 }} onClick={() => {
                            const homeGoals = Number(document.getElementById(`h${idx}`).value);
                            const awayGoals = Number(document.getElementById(`a${idx}`).value);
                            const note = document.getElementById(`n${idx}`).value;
                            if (isNaN(homeGoals) || isNaN(awayGoals)) return;
                            setResults(r => [...r, { home: game.home, away: game.away, homeGoals, awayGoals, note }]);
                          }}>Save</button>
                        </>
                      ) : (
                        <>
                          <input type="number" min="0" placeholder="Team A Goals" style={{ width: 60 }} id={`ta${idx}`} />
                          <input type="number" min="0" placeholder="Team B Goals" style={{ width: 60, marginLeft: 4 }} id={`tb${idx}`} />
                          <input type="text" placeholder="Note (optional)" style={{ width: 120, marginLeft: 4 }} id={`nt${idx}`} />
                          <button style={{ marginLeft: 4 }} onClick={() => {
                            const teamAGoals = Number(document.getElementById(`ta${idx}`).value);
                            const teamBGoals = Number(document.getElementById(`tb${idx}`).value);
                            const note = document.getElementById(`nt${idx}`).value;
                            if (isNaN(teamAGoals) || isNaN(teamBGoals)) return;
                            setResults(r => [...r, {
                              teamA: game.teamA.join(', '),
                              teamB: game.teamB.join(', '),
                              teamAGoals,
                              teamBGoals,
                              sittingPlayer: game.sitting.join(', '),
                              note
                            }]);
                          }}>Save</button>
                        </>
                      )}
                    </div>
                  )}
                  {isCompleted && !isEditing && (
                    <>
                      <span style={{ color: '#28a745', marginLeft: 8 }}>✔ Completed</span>
                      <button style={{ marginLeft: 8 }} onClick={() => {
                        setEditingScheduleIdx(idx);
                        setEditingFields(gameMode === '1v1'
                          ? { homeGoals: result.homeGoals, awayGoals: result.awayGoals, note: result.note || '' }
                          : { teamAGoals: result.teamAGoals, teamBGoals: result.teamBGoals, note: result.note || '' }
                        );
                      }}>✏️ Edit</button>
                    </>
                  )}
                  {isEditing && (
                    <div style={{ marginTop: 4 }}>
                      {gameMode === '1v1' ? (
                        <>
                          <input type="number" min="0" placeholder="Home Goals" style={{ width: 60 }} value={editingFields.homeGoals} onChange={e => setEditingFields(f => ({ ...f, homeGoals: e.target.value }))} />
                          <input type="number" min="0" placeholder="Away Goals" style={{ width: 60, marginLeft: 4 }} value={editingFields.awayGoals} onChange={e => setEditingFields(f => ({ ...f, awayGoals: e.target.value }))} />
                          <input type="text" placeholder="Note (optional)" style={{ width: 120, marginLeft: 4 }} value={editingFields.note} onChange={e => setEditingFields(f => ({ ...f, note: e.target.value }))} />
                          <button style={{ marginLeft: 4 }} onClick={() => {
                            const homeGoals = Number(editingFields.homeGoals);
                            const awayGoals = Number(editingFields.awayGoals);
                            const note = editingFields.note;
                            if (isNaN(homeGoals) || isNaN(awayGoals)) return;
                            setResults(r => r.map((res, i) => i === completedIdx ? { ...res, homeGoals, awayGoals, note } : res));
                            setEditingScheduleIdx(null);
                          }}>Save</button>
                          <button style={{ marginLeft: 4 }} onClick={() => setEditingScheduleIdx(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <input type="number" min="0" placeholder="Team A Goals" style={{ width: 60 }} value={editingFields.teamAGoals} onChange={e => setEditingFields(f => ({ ...f, teamAGoals: e.target.value }))} />
                          <input type="number" min="0" placeholder="Team B Goals" style={{ width: 60, marginLeft: 4 }} value={editingFields.teamBGoals} onChange={e => setEditingFields(f => ({ ...f, teamBGoals: e.target.value }))} />
                          <input type="text" placeholder="Note (optional)" style={{ width: 120, marginLeft: 4 }} value={editingFields.note} onChange={e => setEditingFields(f => ({ ...f, note: e.target.value }))} />
                          <button style={{ marginLeft: 4 }} onClick={() => {
                            const teamAGoals = Number(editingFields.teamAGoals);
                            const teamBGoals = Number(editingFields.teamBGoals);
                            const note = editingFields.note;
                            if (isNaN(teamAGoals) || isNaN(teamBGoals)) return;
                            setResults(r => r.map((res, i) => i === completedIdx ? { ...res, teamAGoals, teamBGoals, note } : res));
                            setEditingScheduleIdx(null);
                          }}>Save</button>
                          <button style={{ marginLeft: 4 }} onClick={() => setEditingScheduleIdx(null)}>Cancel</button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {gameMode === '2v2' && playerNames.length === 4 && (
        <div style={{ margin: '16px 0' }}>
          <label style={{ fontWeight: 'bold', marginRight: 8 }}>Number of Rounds:</label>
          <select value={numRounds} onChange={e => setNumRounds(Number(e.target.value))} style={{ fontSize: '1.1rem', padding: '4px 8px' }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default App;
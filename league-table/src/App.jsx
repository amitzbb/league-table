import { useState } from 'react';
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

function App() {
  const [playerNames, setPlayerNames] = useState([...defaultPlayers]);
  const [results, setResults] = useState([]);
  const [gameMode, setGameMode] = useState('1v1'); // '1v1' or '2v2'
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
    teamBGoals: ''
  });
  const [editIndex, setEditIndex] = useState(null);
  const [error, setError] = useState('');

  const table = calculateTable(playerNames, results, gameMode);

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
      teamBGoals: ''
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
      const sittingPlayer = playerNames.find(p => !allSelected.includes(p));
      if (teamAPlayers.length !== 2 || teamBPlayers.length !== 2 || !sittingPlayer) {
        setError('All 5 players must be assigned (2 per team + 1 sitting)!');
        return;
      }
      if (new Set(allSelected).size !== 4) {
        setError('Each player can only be selected once!');
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
                ? { home: form.home, away: form.away, homeGoals: Number(form.homeGoals), awayGoals: Number(form.awayGoals) }
                : { teamA: [form.teamA1, form.teamA2].join(', '), teamB: [form.teamB1, form.teamB2].join(', '), teamAGoals: Number(form.teamAGoals), teamBGoals: Number(form.teamBGoals), sittingPlayer: playerNames.find(p => ![form.teamA1, form.teamA2, form.teamB1, form.teamB2].includes(p)) }
              )
            : item
        )
      );
      setEditIndex(null);
    } else {
      setResults((r) => [
        ...r,
        gameMode === '1v1' 
          ? { home: form.home, away: form.away, homeGoals: Number(form.homeGoals), awayGoals: Number(form.awayGoals) }
          : { teamA: [form.teamA1, form.teamA2].join(', '), teamB: [form.teamB1, form.teamB2].join(', '), teamAGoals: Number(form.teamAGoals), teamBGoals: Number(form.teamBGoals), sittingPlayer: playerNames.find(p => ![form.teamA1, form.teamA2, form.teamB1, form.teamB2].includes(p)) }
      ]);
    }
    
    setForm({ home: playerNames[0], away: playerNames[1], homeGoals: '', awayGoals: '', teamA1: '', teamA2: '', teamB1: '', teamB2: '', teamAGoals: '', teamBGoals: '' });
    setError('');
  };

  const handleDelete = (idx) => {
    setResults((r) => r.filter((_, i) => i !== idx));
    if (editIndex === idx) {
      setEditIndex(null);
      setForm({ home: playerNames[0], away: playerNames[1], homeGoals: '', awayGoals: '', teamA1: '', teamA2: '', teamB1: '', teamB2: '', teamAGoals: '', teamBGoals: '' });
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
        teamBGoals: ''
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
        teamBGoals: r.teamBGoals
      });
    }
    setEditIndex(idx);
    setError('');
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
        <form onSubmit={e => e.preventDefault()}>
          {playerNames.map((name, idx) => (
            <input
              key={idx}
              type="text"
              value={name}
              onChange={e => handleNameChange(idx, e.target.value)}
              placeholder={`Player ${idx + 1}`}
              maxLength={20}
              style={{ marginRight: 8, marginBottom: 8 }}
            />
          ))}
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
          <button type="submit">{editIndex !== null ? 'Save Edit' : 'Add Result'}</button>
          {editIndex !== null && (
            <button
              type="button"
              style={{ marginLeft: 8, background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}
              onClick={() => {
                setEditIndex(null);
                setForm({ home: playerNames[0], away: playerNames[1], homeGoals: '', awayGoals: '', teamA1: '', teamA2: '', teamB1: '', teamB2: '', teamAGoals: '', teamBGoals: '' });
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ minWidth: '200px', textAlign: 'left', fontWeight: 'bold' }}>Sitting Player:</label>
              <span style={{ width: '200px', fontWeight: 'bold' }}>{playerNames.find(p => ![form.teamA1, form.teamA2, form.teamB1, form.teamB2].includes(p)) || '-'}</span>
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button type="submit">{editIndex !== null ? 'Save Edit' : 'Add Result'}</button>
            {editIndex !== null && (
              <button
                type="button"
                style={{ marginLeft: 8, background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}
                onClick={() => {
                  setEditIndex(null);
                  setForm({ home: '', away: '', homeGoals: '', awayGoals: '', teamA1: '', teamA2: '', teamB1: '', teamB2: '', teamAGoals: '', teamBGoals: '' });
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
                setForm(f => ({ ...f, teamA1: '', teamA2: '', teamB1: '', teamB2: '', teamAGoals: '', teamBGoals: '' }));
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
                  <td>{row.name}</td>
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
    </div>
  );
}

export default App;

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';

function InvestigationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [requestingHint, setRequestingHint] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchCase = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get(`/cases/${id}`);
        if (!ignore) {
          setCaseData(response.data.case);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError?.response?.data?.message || 'Unable to load the case.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchCase();
    return () => {
      ignore = true;
    };
  }, [id]);

  const handleDiscover = async (clueId) => {
    setDiscovering(true);
    try {
      const response = await api.post(`/cases/${id}/clues/${clueId}/discover`);
      setCaseData((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          clues: previous.clues.map((clue) =>
            clue.id === clueId ? { ...clue, discovered: true, content: response.data.clue.content } : clue,
          ),
          progress: response.data.progress,
        };
      });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to discover the clue.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleHint = async () => {
    setRequestingHint(true);
    try {
      const response = await api.post(`/cases/${id}/hints`, {}, {
        headers: { 'X-Idempotency-Key': `hint-${id}-${Date.now()}` },
      });
      const { hint, progress } = response.data;
      setCaseData((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          progress,
          hintsRemaining: progress.hintsRemaining,
          latestHint: hint,
        };
      });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to request a hint.');
    } finally {
      setRequestingHint(false);
    }
  };

  const handleAccuse = () => {
    navigate(`/cases/${id}/accuse`);
  };

  if (loading) {
    return <div className="page-shell"><div className="card"><p>Loading your case...</p></div></div>;
  }

  if (error) {
    return <div className="page-shell"><div className="card"><p className="alert error">{error}</p><Link to="/" className="primary-button inline">Home</Link></div></div>;
  }

  if (!caseData) {
    return null;
  }

  return (
    <div className="page-shell investigation-grid">
      <aside className="card">
        <p className="eyebrow">Case summary</p>
        <h2>{caseData.title}</h2>
        <p>{caseData.story}</p>
        <div className="mini-meta">
          <span>Difficulty: {caseData.difficulty}</span>
          <span>Clues found: {caseData.progress.cluesDiscovered}/{caseData.clues.length}</span>
          <span>Hints used: {caseData.progress.hintsUsed}</span>
        </div>

        <div className="stack">
          <button type="button" onClick={handleHint} disabled={requestingHint || caseData.hintsRemaining === 0} className="secondary-button">
            {requestingHint ? 'Requesting hint…' : caseData.hintsRemaining === 0 ? 'No hints remaining' : `Request hint (${caseData.hintsRemaining} left)`}
          </button>
          <button type="button" onClick={handleAccuse} className="primary-button">Make an Accusation</button>
        </div>

        {caseData.latestHint ? (
          <div className="hint-box">
            <strong>Hint:</strong> {caseData.latestHint.text}
          </div>
        ) : null}
      </aside>

      <main className="card">
        <h3>Suspects</h3>
        <div className="suspect-grid">
          {caseData.suspects.map((suspect) => (
            <div className="suspect-card" key={suspect.id}>
              <p className="suspect-name">{suspect.name}</p>
              <p>{suspect.description}</p>
            </div>
          ))}
        </div>

        <h3>Clues</h3>
        <div className="clue-list">
          {caseData.clues.map((clue) => (
            <div key={clue.id} className={clue.discovered ? 'clue-item discovered' : 'clue-item'}>
              <div>
                <strong>{clue.title}</strong>
                <p>{clue.summary}</p>
              </div>
              <button
                type="button"
                className="tiny-button"
                disabled={discovering || clue.discovered}
                onClick={() => handleDiscover(clue.id)}
              >
                {clue.discovered ? 'Discovered' : 'Discover'}
              </button>
              {clue.discovered ? <div className="clue-content">{clue.content}</div> : null}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default InvestigationPage;

import { Link, useLocation, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api/client';

function ResultsPage() {
  const { id } = useParams();
  const location = useLocation();
  const [result, setResult] = useState(location.state?.result || null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadResult = async () => {
      if (result) {
        return;
      }

      try {
        const response = await api.get(`/cases/${id}/result`);
        setResult(response.data.result);
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Unable to load the result.');
      }
    };

    loadResult();
  }, [id, result]);

  if (error) {
    return <div className="page-shell"><div className="card"><p className="alert error">{error}</p><Link to="/" className="primary-button inline">Home</Link></div></div>;
  }

  if (!result) {
    return <div className="page-shell"><div className="card"><p>Loading results...</p></div></div>;
  }

  return (
    <div className="page-shell">
      <div className="card result-box">
        <p className="eyebrow">Verdict</p>
        <h1>{result.correct ? 'Case solved' : 'Case unresolved'}</h1>
        <p className="lead">{result.correct ? 'You identified the culprit correctly.' : 'The correct culprit has been revealed.'}</p>

        <div className="result-summary">
          <div><strong>Culprit:</strong> {result.culprit.name}</div>
          <div><strong>Score:</strong> {result.score}</div>
          <div><strong>Base points:</strong> {result.scoreBreakdown.basePoints}</div>
          <div><strong>Clue points:</strong> {result.scoreBreakdown.cluePoints}</div>
          <div><strong>Hint penalty:</strong> {result.scoreBreakdown.hintPenalty}</div>
        </div>

        <div className="panel">
          <h3>Case explanation</h3>
          <p>{result.explanation}</p>
        </div>

        <div className="button-row">
          <Link to="/" className="primary-button">Play Again</Link>
          <Link to={`/cases/${id}`} className="secondary-button">Review Case</Link>
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;

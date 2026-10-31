import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';

function AccusationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [selectedSuspectId, setSelectedSuspectId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCase = async () => {
      try {
        const response = await api.get(`/cases/${id}`);
        setCaseData(response.data.case);
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Unable to load this case.');
      }
    };

    loadCase();
  }, [id]);

  const handleSubmit = async () => {
    if (!selectedSuspectId) {
      setError('Please choose one suspect.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await api.post(`/cases/${id}/accuse`, { suspectId: selectedSuspectId });
      navigate(`/cases/${id}/results`, { state: { result: response.data.result } });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to submit the accusation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!caseData) {
    return <div className="page-shell"><div className="card"><p>Loading accusation page...</p></div></div>;
  }

  return (
    <div className="page-shell">
      <div className="card">
        <p className="eyebrow">Final accusation</p>
        <h1>Who is the culprit?</h1>
        <p className="lead">Choose exactly one suspect. This is the final decision.</p>

        <div className="suspect-list">
          {caseData.suspects.map((suspect) => (
            <label key={suspect.id} className={selectedSuspectId === suspect.id ? 'suspect-option selected' : 'suspect-option'}>
              <input
                type="radio"
                name="suspect"
                checked={selectedSuspectId === suspect.id}
                onChange={() => setSelectedSuspectId(suspect.id)}
              />
              <span>{suspect.name}</span>
              <small>{suspect.description}</small>
            </label>
          ))}
        </div>

        {error ? <div className="alert error">{error}</div> : null}

        <div className="button-row">
          <Link to={`/cases/${id}`} className="secondary-button">Return to Investigation</Link>
          <button type="button" className="primary-button" disabled={submitting || !selectedSuspectId} onClick={handleSubmit}>
            {submitting ? 'Submitting…' : 'Submit Accusation'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccusationPage;

let availability = null;

export function tutorAvailable() {
  if (!availability) {
    availability = fetch('/api/tutor')
      .then((response) => (response.ok ? response.json() : { available: false }))
      .then((body) => Boolean(body.available))
      .catch(() => false);
  }
  return availability;
}

export async function askTutor(review) {
  let response;
  try {
    response = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen: review.fenBefore,
        played: review.san,
        best: review.bestSan,
        line: review.bestLine,
        grade: review.grade,
        before: review.before,
        after: review.after,
      }),
    });
  } catch {
    throw new Error('Could not reach the tutor. Check your connection.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.msg || 'The tutor could not answer right now.');
  }
  return body.text;
}

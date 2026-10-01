import React from 'react';
import './leaderboard.css';

export function Leaderboard() {
  return (
    <main className="container-fluid bg-secondary text-center">
      <h2>Top survivors</h2>
      <p>Best completed attempts, stored in the database.</p>

      {/* Database data placeholder. Will eventually be populated from MongoDB via the backend service. */}
      <table className="table table-warning table-striped-columns">
        <thead className="table-dark">
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Moves survived</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Magnus_Fan_42</td>
            <td>63</td>
            <td>August 14, 2026</td>
          </tr>
          <tr>
            <td>2</td>
            <td>도윤 이</td>
            <td>51</td>
            <td>August 2, 2026</td>
          </tr>
          <tr>
            <td>3</td>
            <td>rookie_rook</td>
            <td>38</td>
            <td>July 21, 2026</td>
          </tr>
          <tr>
            <td>4</td>
            <td>Priya</td>
            <td>29</td>
            <td>July 3, 2026</td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}

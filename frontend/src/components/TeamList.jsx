import React from 'react';
import PersonIcon from '@mui/icons-material/Person';

const TeamList = ({ matched, feedbacks, onFeedback, currentUser }) => {
  // 현재 유저가 속한 팀을 찾음
  const myTeamIndex = matched.findIndex((team) =>
    team.some((member) => member.id === currentUser?.id)
  );

  const myTeam = myTeamIndex !== -1 ? matched[myTeamIndex] : null;
  const otherTeams = matched.filter((_, idx) => idx !== myTeamIndex);

  // 팀 렌더링 함수
  const renderTeam = (team, index, isMyTeam = false) => {
    const sortedTeam = [...team].sort((a, b) => {
      if (a.id === currentUser?.id) return -1;
      if (b.id === currentUser?.id) return 1;
      return 0;
    });

    return (
      <div
        key={index}
        style={{
          border: '2px solid #ccc',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1.5rem',
          backgroundColor: isMyTeam ? '#FFF1EC' : 'white',
        }}
      >
        <h3
          style={{
            fontWeight: 700,
            fontSize: '1.1rem',
            color: isMyTeam ? '#FF6B35' : '#333',
          }}
        >
          {isMyTeam ? '⭐ 내 팀 정보' : `${index + 1}팀`}
        </h3>

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {sortedTeam.map((member) => {
            const userFeedback = feedbacks?.[member.id]; // 👍 or 👎
            const isClicked = Boolean(userFeedback); // 이미 클릭했는지 여부

            return (
              <li
                key={member.id}
                style={{
                  padding: '1rem 0',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon style={{ marginRight: '0.3rem', color: '#444' }} />
                  <strong style={{ fontSize: '1.05rem' }}>{member.name}</strong>
                  {(member.rating === undefined || member.participation === undefined) && (
                    <span
                      style={{
                        backgroundColor: '#FF6B35',
                        color: 'white',
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        marginLeft: '0.5rem',
                      }}
                    >
                      NEW
                    </span>
                  )}
                </div>

                <div style={{ paddingLeft: '1.5rem' }}>
                  <p>
                    <strong>희망 역할군:</strong> {member.mainRole || member.main_role}
                  </p>
                  <p>
                    <strong>보조 가능 역할군:</strong> {member.subRole || member.sub_role}
                  </p>
                  <p>
                    <strong>보유 역량:</strong> {(member.keywords || []).join(', ')}
                  </p>

                  {member.rating !== undefined && member.participation !== undefined ? (
                    <p style={{ marginTop: '0.3rem', color: '#666' }}>
                      ⭐{member.rating.toFixed(1)} ({member.participation}회 참여)
                    </p>
                  ) : (
                    <p style={{ color: '#aaa' }}>⭐ 아직 별점이 없어요 / 첫 매칭 대기 중</p>
                  )}
                </div>

                {/* ✅ 피드백 버튼 */}
                <div style={{ marginTop: '0.3rem', paddingLeft: '1.5rem' }}>
                  <button
                    onClick={() => !isClicked && onFeedback(member.id, '👍')}
                    disabled={isClicked}
                    style={{
                      marginRight: '0.5rem',
                      backgroundColor: userFeedback === '👍' ? '#FF6B35' : '#f0f0f0',
                      color: userFeedback === '👍' ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '0.4rem 0.8rem',
                      fontSize: '1rem',
                      cursor: isClicked ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    👍
                  </button>

                  <button
                    onClick={() => !isClicked && onFeedback(member.id, '👎')}
                    disabled={isClicked}
                    style={{
                      backgroundColor: userFeedback === '👎' ? '#FF6B35' : '#f0f0f0',
                      color: userFeedback === '👎' ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '0.4rem 0.8rem',
                      fontSize: '1rem',
                      cursor: isClicked ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    👎
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div>
      {myTeam && renderTeam(myTeam, myTeamIndex, true)}
      {otherTeams.map((team, idx) => renderTeam(team, idx))}
    </div>
  );
};

export default TeamList;
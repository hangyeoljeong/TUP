import http from '../lib/http';

console.log("📡 [DEBUG] teamup1.js 로드됨");

// 1) 사용자 입력 저장
export const saveUserInput = async (payload) => {
  const { data } = await http.post('team-matching1/save/', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
};

// 2) 팀 매칭 시도
export const applyTeamup = async (userId) => {
  const { data } = await http.post(
    'team-matching1/apply/', // ✅ URL
    JSON.stringify({ userId }), // ✅ body를 JSON 문자열로
    {
      headers: { 'Content-Type': 'application/json' }, // ✅ JSON 보낸다고 명시
    }
  );
  return data;
};

// 3) 매칭된 팀 목록 조회
export const getMatchedTeams = async () => {
  const { data } = await http.get('team-matching1/teams/');
  return data;
};

export const performFeedbackAction = async ({
  teamId,
  userId,
  action,
  agree,
  agreedUserIds,
}) => {
  console.log('🟠 [DEBUG] performFeedbackAction 실행됨:', {
    action,
    teamId,
    userId,
    agree,
    agreedUserIds,
  });

  let endpoint = '';
  let payload = {};

  if (action === 'feedback') {
    endpoint = 'team-matching1/feedback/';
    payload = { 
      team_id: teamId, 
      user_id: userId, 
      agree: agree 
    };  // ✅ 수정됨
  

    console.log('📡 피드백 요청 전송:', payload);
    try {
      const { data } = await http.post(endpoint, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('✅ 피드백 응답:', data);
      return data;
    } catch (err) {
      console.error('❌ 피드백 전송 실패:', err);
      if (err.response) console.error('서버 응답:', err.response.data);
      throw err;
    }
  }
  // 나머지 rematch / requeue 는 그대로
  else if (action === 'rematch') {
    endpoint = 'team-matching1/apply_team_rematch/';
    payload = {
      contest_id: 1,
      team_id: teamId,
      agreed_user_ids: agreedUserIds,
    };
  } else if (action === 'requeue') {
    endpoint = 'team-matching1/requeue_team/';
    payload = { team_id: teamId, user_id: userId };
  }

  if (endpoint && action !== 'feedback') {
    const { data } = await http.post(endpoint, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('✅ 서버 응답:', data);
    return data;
  }
};

// 6) 대기열 사용자
export const getWaitingUsers = async () => {
  const { data } = await http.get('team-matching1/waiting-users/');
  return data; // [ { userId, mainRole, subRole, skills, keywords, hasReward } ]
};

export const applyTeamRematch = async (payload) => {
  try {
    console.log('📤 [API 호출] applyTeamRematch payload:', payload);
    const res = await http.post('team-matching1/apply_team_rematch/', payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('📥 [API 응답] applyTeamRematch res:', res);
    return res; // ✅ data만이 아니라 전체 response 객체 리턴
  } catch (err) {
    console.error('❌ applyTeamRematch 실패:', err.response?.data || err.message);
    throw err;
  }
};


import axios from 'axios';

const BASE = '/api/team2';

axios.defaults.withCredentials = true;
// ===============================
// 1️⃣ 팀 생성
// ===============================
export const createTeam = async (teamData) => {
  const res = await axios.post(`${BASE}/teams/create/`, teamData, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
};

// ===============================
// 2️⃣ 팀 리스트 조회 (필터, 리워드 포함)
// ===============================
export const getTeamList = async (filters = {}) => {
  // 예: ?category=프론트엔드&has_reward=true
  const res = await axios.get(`${BASE}/teams/`, { params: filters });
  return res.data;
};

// ===============================
// 3️⃣ 팀 상세 정보
// ===============================
export const getTeamDetails = async (teamId) => {
  const res = await axios.get(`${BASE}/teams/${teamId}/`);
  return res.data;
};

// ===============================
// 4️⃣ 팀 삭제
// ===============================
export const deleteTeam = async (teamId) => {
  const res = await axios.delete(`${BASE}/teams/${teamId}/delete/`);
  return res.data;
};
// ===============================
// 5️⃣ 팀 탈퇴 (신규 추가 ✅)
// ===============================
export const leaveTeam = async (teamId) => {
  const res = await axios.post(`${BASE}/teams/${teamId}/leave/`);
  return res.data;
};

// ===============================
// 6️⃣ 팀 지원 (Application 생성)
// ===============================
export const applyToTeam = async (teamId, userId) => {
  // serializer가 요구하는 키 이름으로 전송
  const res = await axios.post(`${BASE}/teams/${teamId}/apply/`, {
    team: teamId,
    user: userId,
  });
  return res.data;
};

// ===============================
// 7️⃣ 지원자 수락
// ===============================
export const acceptApplicant = async (teamId, applicationId) => {
  const res = await axios.post(`${BASE}/teams/${teamId}/accept/`, {
    application_id: applicationId, // 백엔드가 요구하는 데이터
  });
  return res.data;
};

// ===============================
// 8️⃣ 지원자 거절 (추가 ✅)
// ===============================
export const rejectApplicant = async (applicationId) => {
  const res = await axios.post(`${BASE}/applications/${applicationId}/reject/`);
  return res.data;
};

// ===============================
// 9️⃣ 초대 보내기
// ===============================
export const sendInvite = async (teamId, targetUserId) => {
  const res = await axios.post(`${BASE}/teams/${teamId}/invite/`, {
    user: targetUserId,
    user_id: targetUserId, 
    team: teamId, // ✅ 추가!
  });
  return res.data;
};


// ===============================
// 🔟 초대 응답 (수락/거절)
// ===============================
export const respondToInvite = async (inviteId, accepted) => {
  const action = accepted ? 'accept' : 'reject';
  const res = await axios.post(`${BASE}/invitations/${inviteId}/${action}/`);
  return res.data;
};
// ===============================
// 11 내 초대 목록 조회
// ===============================
export const getMyInvites = async (userId) => {
  const res = await axios.get(`${BASE}/my-invites/${userId}/`);
  return res.data;
};

// ===============================
// 12 내 지원 목록 조회
// ===============================
export const getMyApplications = async (userId) => {
  const res = await axios.get(`${BASE}/my-applications/${userId}/`);
  return res.data;
};

// ===============================
// 13 지원자 목록 필터링
// ===============================
// 예: /api/team2/applicants/filter/?main_role=백엔드&skills=React
export const getApplicants = async (filters = {}) => {
  const res = await axios.get(`${BASE}/applicants/filter/`, { params: filters });
  return res.data;
};

// ===============================
// 14 프로필 업데이트
// ===============================
export const updateUserProfile = async (profileData) => {
  const res = await axios.post(`${BASE}/profile/update/`, profileData);
  return res.data;
};

// ===============================
// 15 대기열 해제 (등록 취소)
// ===============================
export const deregisterProfile = async () => {
  try {
    const res = await axios.delete(`${BASE}/profile/update/`);
    return res.data; // ✅ 반드시 리턴해야 함
  } catch (err) {
    console.error("API 요청 실패:", err);
    throw err; // ✅ 에러는 그대로 던져줘야 catch에서만 잡힘
  }
};




export const removeUserProfile = async () => {
  const res = await axios.delete(`${BASE}/profile/update/`);
  return res.data;
};

export const fetchWaitingList = async () => {
  const res = await axios.get(`${BASE}/waiting/`);
  return res.data; // 배열
};


// ===============================
// 🔹 팀매칭2 개인 리워드 토글
// ===============================
export const toggleReward = async (userId) => {
  const res = await axios.post(`${BASE}/users/${userId}/reward/`);
  return res.data;
};

// ===============================
// 🔹 팀매칭2 팀 리워드 토글
// ===============================
export const toggleTeamRoomReward = async (teamId) => {
  const res = await axios.post(`${BASE}/team-room/${teamId}/reward/`);
  return res.data;
};

export const getTeamByMember = async (userId) => {
  const res = await axios.get(`${BASE}/my-team/${userId}/`);
  return res.data;
};
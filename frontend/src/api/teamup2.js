import http from '../lib/http';

console.log("📡 [DEBUG] teamup2.js 로드됨");

// =======================================================
// 1) 팀 생성
// =======================================================
export const createTeam = async (payload) => {
  const { data } = await http.post(
    'team-matching2/teams/create/',
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );
  return data;
};

// =======================================================
// 2) 팀 목록 조회 (필터 포함)
// 예: ?category=백엔드&has_reward=true
// =======================================================
export const getTeamList = async (filters = {}) => {
  const { data } = await http.get(
    'team-matching2/teams/',
    { params: filters }
  );
  return data;
};

// =======================================================
// 3) 팀 상세 조회
// =======================================================
export const getTeamDetails = async (teamId) => {
  const { data } = await http.get(`team-matching2/teams/${teamId}/`);
  return data;
};

// =======================================================
// 4) 팀 삭제
// =======================================================
export const deleteTeam = async (teamId) => {
  const { data } = await http.delete(
    `team-matching2/teams/${teamId}/delete/`
  );
  return data;
};

// =======================================================
// 프로필 삭제(대기열 해제)
// =======================================================
export const deregisterProfile = async () => {
  const { data } = await http.delete(
    'team-matching2/profile/update/'
  );
  return data;
};

// =======================================================
// 5) 팀 탈퇴
// =======================================================
export const leaveTeam = async (teamId) => {
  const { data } = await http.post(
    `team-matching2/teams/${teamId}/leave/`
  );
  return data;
};

// =======================================================
// 6) 팀 지원 (Application 생성)
// =======================================================
export const applyToTeam = async (teamId, userId) => {
  const { data } = await http.post(
    `team-matching2/teams/${teamId}/apply/`,
    { team: teamId, user: userId },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return data;
};

// =======================================================
// 7) 지원자 수락
// =======================================================
export const acceptApplicant = async (teamId, applicationId) => {
  const { data } = await http.post(
    `team-matching2/teams/${teamId}/accept/`,
    { application_id: applicationId },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return data;
};

// =======================================================
// 8) 지원자 거절
// =======================================================
export const rejectApplicant = async (applicationId) => {
  const { data } = await http.post(
    `team-matching2/applications/${applicationId}/reject/`
  );
  return data;
};

// =======================================================
// 9) 초대 보내기
// =======================================================
export const sendInvite = async (teamId, targetUserId) => {
  const { data } = await http.post(
    `team-matching2/teams/${teamId}/invite/`,
    { user: targetUserId, user_id: targetUserId, team: teamId },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return data;
};

// =======================================================
// 10) 초대 수락/거절
// =======================================================
export const respondToInvite = async (inviteId, accepted) => {
  const action = accepted ? 'accept' : 'reject';
  const { data } = await http.post(
    `team-matching2/invitations/${inviteId}/${action}/`
  );
  return data;
};

// =======================================================
// 11) 내 초대 목록 조회
// =======================================================
export const getMyInvites = async (userId) => {
  const { data } = await http.get(
    `team-matching2/my-invites/${userId}/`
  );
  return data;
};

// =======================================================
// 12) 내 지원 목록 조회
// =======================================================
export const getMyApplications = async (userId) => {
  const { data } = await http.get(
    `team-matching2/my-applications/${userId}/`
  );
  return data;
};

// =======================================================
// 13) 지원자 필터링 조회
// =======================================================
export const getApplicants = async (filters = {}) => {
  const { data } = await http.get(
    'team-matching2/applicants/filter/',
    { params: filters }
  );
  return data;
};

// =======================================================
// 14) 유저 프로필 업데이트
// =======================================================
export const updateUserProfile = async (payload) => {
  const { data } = await http.post(
    'team-matching2/profile/update/',
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );
  return data;
};

// =======================================================
// 15) 대기열 조회
// =======================================================
export const fetchWaitingList = async () => {
  const { data } = await http.get('team-matching2/waiting/');
  return data;
};

// =======================================================
// 16) 개인 리워드 토글
// =======================================================
export const toggleReward = async (userId) => {
  const { data } = await http.post(
    `team-matching2/users/${userId}/reward/`
  );
  return data;
};

// =======================================================
// 17) 팀 리워드 토글
// =======================================================
export const toggleTeamRoomReward = async (teamId) => {
  const { data } = await http.post(
    `team-matching2/team-room/${teamId}/reward/`
  );
  return data;
};

// =======================================================
// 18) 자신이 속한 팀 조회
// =======================================================
export const getTeamByMember = async (userId) => {
  const { data } = await http.get(
    `team-matching2/my-team/${userId}/`
  );
  return data;
};

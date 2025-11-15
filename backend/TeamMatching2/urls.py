from django.urls import path
from .views import (
    TeamListView, TeamCreateView, TeamDetailView, TeamApplyView, InviteUserView,
    AcceptInviteView, RejectInviteView, MyInvitesView,
    AcceptApplicationView, RejectApplicationView, MyApplicationsView,
    ApplicantFilterView, WaitingListView, TeamDeleteView,
    UserProfileUpdateView, TeamLeaveView,
    RewardToggleView,TeamRoomRewardToggleView, GetTeamByMember
)

urlpatterns = [
    # ========================
    # ✅ 팀 (Teams)
    # ========================
    path("teams/<int:pk>/delete/", TeamDeleteView.as_view(), name="team-delete"),
    path("teams/", TeamListView.as_view(), name="team-list"),
    path("teams/create/", TeamCreateView.as_view(), name="team-create"),
    path("teams/<int:team_id>/", TeamDetailView.as_view(), name="team-detail"),
    path("teams/<int:team_id>/apply/", TeamApplyView.as_view(), name="team-apply"),
    path("teams/<int:team_id>/invite/", InviteUserView.as_view(), name="team-invite"),
    path("teams/<int:team_id>/accept/", AcceptApplicationView.as_view(), name="accept-application"),
    path("teams/<int:team_id>/leave/", TeamLeaveView.as_view(), name="team-leave"),

    # ========================
    # ✅ 초대 (Invitations)
    # ========================
    path("invitations/<int:invite_id>/accept/", AcceptInviteView.as_view(), name="accept-invite"),
    path("invitations/<int:invite_id>/reject/", RejectInviteView.as_view(), name="reject-invite"),

    path("my-invites/<int:user_id>/", MyInvitesView.as_view(), name="my-invites"),
    # ========================
    # ✅ 신청 (Applications)
    # ========================
    path("applications/<int:application_id>/reject/", RejectApplicationView.as_view(), name="reject-application"),

    # ⚠️ 중복 제거 + 경로 명확화
    path("my-applications/<int:user_id>/", MyApplicationsView.as_view(), name="my-applications"),

    # ========================
    # ✅ 유저 관련
    # ========================
    path("applicants/filter/", ApplicantFilterView.as_view(), name="applicant-filter"),
    path("profile/update/", UserProfileUpdateView.as_view(), name="userprofile-update"),

    # ========================
    # ✅ 기타
    # ========================
    path("waiting/", WaitingListView.as_view(), name="waiting-list"),
    path("users/<int:user_id>/reward/", RewardToggleView.as_view(), name="toggle-reward"),
    path("team-room/<int:team_id>/reward/", TeamRoomRewardToggleView.as_view(), name="teamroom-reward-toggle"),
    path('my-team/<int:user_id>/', GetTeamByMember.as_view(), name='my-team'),
]

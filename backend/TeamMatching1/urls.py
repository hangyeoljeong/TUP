from django.urls import path
from . import views

app_name = "team-matching1"

urlpatterns = [
    path("save/", views.save_user_input),
    path("apply/", views.apply_teamup),
    path("teams/", views.get_matched_teams),
    path("feedback/", views.submit_feedback),
    path('waiting-users/', views.get_waiting_users, name='waiting_users'),
    path("apply_team_rematch/", views.apply_team_rematch, name="apply_team_rematch"),
    path("requeue_team/",views.move_disagreed_users_to_waiting),
    
    # path("teamup/submit_feedback", views.perform_feedback_action),  # ✔️ 마지막 API만 /teamup 사용
]

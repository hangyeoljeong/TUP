from django.contrib import admin
from .models import (
    WaitingPool,
    TeamRoom,
    TeamMember,
    Application,
    Invitation,
)

# =======================
# 🧩 WaitingPool
# =======================
@admin.register(WaitingPool)
class WaitingPoolAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'main_role', 'sub_role') # has_reward 제거
    search_fields = ('user_id', 'main_role', 'sub_role')
    list_filter = () 


# =======================
# 🧩 TeamRoom
# =======================
@admin.register(TeamRoom)
class TeamRoomAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'leader_name', 'max_members', 'status', 'category')
    search_fields = ('user__name', 'leader_name')
    list_filter = ('status', 'category')


# =======================
# 🧩 TeamUser
# =======================
@admin.register(TeamMember)
class TeamUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'team', 'user', 'role', 'status', 'joined_at')
    search_fields = ('team__id', 'user__name')
    list_filter = ('status', 'role')


# =======================
# 🧩 Application
# =======================
@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('id', 'team', 'user', 'status')
    search_fields = ('team__id', 'user__name')
    list_filter = ('status',)


# =======================
# 🧩 Invitation
# =======================
@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ('id', 'team', 'user', 'status')
    search_fields = ('team__id', 'user__name')
    list_filter = ('status',)

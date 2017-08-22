"""Innovation Maps URL Configuration
The `urlpatterns` list routes URLs to views.
"""
from django.conf.urls import url
from django.contrib import admin
from django.contrib.auth import views as auth_views

from InnovationMaps.views import *

urlpatterns = [
    # Development
    url(r'^admin/', admin.site.urls),
    url(r'^signup/$', signup, name='signup'),
    url(r'^login/$', auth_views.login, name='login'),
    url(r'^logout/$', auth_views.logout, {'next_page': '/about'}, name='logout'),

    # Application
    url(r'^about/$', about, name='innovationmaps_about'),
    url(r'^guide/$', guidepage, name='innovationmaps_guide'),
    url(r'^pdf/$', guide, name='innovationmaps_pdf'),
    url(r'^template/$', template, name='innovationmaps_template'),
    url(r'^related/$', related, name='innovationmaps_related'),
    url(r'^map/$', map, name='innovationmaps_map'),

    # Base URL
    url(r'^$', about),
]

"""Innovation Maps URL Configuration
The `urlpatterns` list routes URLs to views.
"""
from django.conf.urls import url
from InnovationMaps.views import *

urlpatterns = [
    url(r'^about/$', about, name='innovationmaps_about'),
    url(r'^guide/$', guide, name='innovationmaps_guide'),
    url(r'^pdf/$', pdf, name='innovationmaps_pdf'),
    url(r'^template/$', template, name='innovationmaps_template'),
    url(r'^example/$', example, name='innovationmaps_example'),
    url(r'^related/$', related, name='innovationmaps_related'),
    url(r'^map/$', map, name='innovationmaps_map'),
    url(r'^getData/$', data, name='innovationmaps_getData'),
    url(r'filter/$', filter, name='innovationmaps_filter'),
    url(r'^$', about),  # Base URL
]

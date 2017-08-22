# -*- coding: utf-8 -*-
import os

from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm
from django.http import FileResponse
from django.http import Http404
from django.shortcuts import render, redirect

from InnovationMaps.settings import STATIC_ROOT


def about(request):
    return render(request, 'about.html')


def guidepage(request):
    return render(request, 'guide.html')


def guide(request):
    path = os.path.join(STATIC_ROOT, 'data', 'Innovation Maps Guideline.pdf')
    if not os.path.exists(path):
        raise Http404()
    else:
        return FileResponse(open(path, 'rb'), content_type='application/pdf')


def template(request):
    path = os.path.join(STATIC_ROOT, 'data', 'Template.xlsx')
    if not os.path.exists(path):
        raise Http404()
    else:
        return FileResponse(open(path, 'rb'), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


def related(request):
    return render(request, 'related.html')


def signup(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('username')
            raw_password = form.cleaned_data.get('password1')
            user = authenticate(username=username, password=raw_password)
            login(request, user)
            return redirect('about')
    else:
        form = UserCreationForm()
    return render(request, 'signup.html', {'form': form})


def map(request):
    return render(request, 'map.html')

# -*- coding: utf-8 -*-
import os
import json

from django.shortcuts import render
from django.http import FileResponse, JsonResponse, Http404

from InnovationMaps.models import *
from InnovationMaps.settings import STATIC_ROOT


def about(request):
    return render(request, 'about.html')


def guide(request):
    return render(request, 'guide.html')


def pdf(request):
    print STATIC_ROOT
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


def map(request):
    return render(request, 'map.html')


def example(request):
    path = os.path.join(STATIC_ROOT, 'data', 'Example.csv')
    if not os.path.exists(path):
        raise Http404()
    else:
        return FileResponse(open(path, 'rb'), content_type='text/csv')


def filter(request):
    if request.is_ajax():
        data = json.load(open(os.path.join(STATIC_ROOT, 'data', request.GET.get("file", ""))))
        term = request.GET.get("q", "")
        p = request.GET.get("p", "")
        if p:
            data = [x for x in data if(x['id'].startswith('UK') or x['id'].startswith('FI'))]
        filtered = [x for x in data if(term in x['id'] or term in x['name'] or ('en' in x and term in x['en']))]
        return JsonResponse(json.dumps(filtered), safe=False)


def data(request):
    if request.is_ajax():
        sql = """SELECT ProjectId, Title, InnovationMaps_organisation.Region AS Region, FundingAmount, OECD, NABS
                 FROM InnovationMaps_project LEFT OUTER JOIN InnovationMaps_organisation ON InnovationMaps_project.Organisation_id = InnovationMaps_organisation.LeadROId
                 WHERE Region IS NOT "" AND OECD IS NOT "" AND NABS IS NOT ""
              """
        region = request.GET.get("Region", "")
        if region != "":
            sql += "AND Region LIKE \"" + region + "%\""
        oecd = request.GET.get("OECD", "")
        if oecd != "":
            sql += "AND OECD LIKE \"%" + oecd + "%\""
        nabs = request.GET.get("NABS", "")
        if nabs != "":
            sql += "AND OECD LIKE \"%" + nabs + "%\""
        data = []
        for r in Project.objects.raw(sql):
            data.append({'Project Identifier': r.Title, 'Region(s)': r.Region, 'Funding': str(r.FundingAmount), 'OECD': r.OECD, 'NABS': r.NABS})
        return JsonResponse(json.dumps(data), safe=False)

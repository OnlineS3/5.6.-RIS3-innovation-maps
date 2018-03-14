from django.db import models


class Funder(models.Model):
    FundingOrgId = models.CharField(primary_key=True, max_length=36)
    FundingOrgName = models.CharField(max_length=255)

    class Meta:
        app_label = 'InnovationMaps'


class Organisation(models.Model):
    LeadROId = models.CharField(primary_key=True, max_length=36)
    LeadROName = models.CharField(max_length=255)
    Region = models.CharField(max_length=50)

    class Meta:
        app_label = 'InnovationMaps'


class Project(models.Model):
    ProjectId = models.CharField(primary_key=True, max_length=36)
    ProjectCategory = models.CharField(max_length=50)
    Department = models.CharField(max_length=255, null=True, blank=True)
    Title = models.CharField(max_length=255, null=True, blank=True)
    StartDate = models.DateField()
    EndDate = models.DateField(null=True, blank=True)
    FundingAmount = models.DecimalField(max_digits=12, decimal_places=2)
    Status = models.CharField(max_length=6)
    Topic = models.CharField(max_length=255, null=True, blank=True)
    Sectors = models.CharField(max_length=255, null=True, blank=True)
    Funder = models.ForeignKey(Funder)
    Organisation = models.ForeignKey(Organisation)
    OECD = models.CharField(max_length=4, null=True, blank=True)
    NABS = models.CharField(max_length=5, null=True, blank=True)

    class Meta:
        app_label = 'InnovationMaps'

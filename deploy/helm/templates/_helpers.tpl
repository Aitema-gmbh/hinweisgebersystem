{{/*
aitema|Hinweis Helm Chart Helper Templates
*/}}

{{/*
Expand the name of the chart.
*/}}
{{- define "aitema-hinweis.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "aitema-hinweis.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart label.
*/}}
{{- define "aitema-hinweis.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "aitema-hinweis.labels" -}}
helm.sh/chart: {{ include "aitema-hinweis.chart" . }}
{{ include "aitema-hinweis.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: hinweisgebersystem
aitema.de/compliance: hinschg
{{- end }}

{{/*
Selector labels.
*/}}
{{- define "aitema-hinweis.selectorLabels" -}}
app.kubernetes.io/name: {{ include "aitema-hinweis.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

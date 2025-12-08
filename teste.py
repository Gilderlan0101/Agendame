dates = {
    "Name": "Gilderlan.dev",
    "Job": "Dev",
    "Salary": None,
    "Languagem": None,
    "Company": None,
}

update_fields = {
    "Name": "Gilderlan.dev oiii",
    "Job": "Dev",
    "Salary": "6.300",  # Note: lowercase 's' diferente do original
    "Languagem": "Python",
    "Company": "Empresa BR",
}

# Atualiza apenas os campos que são None no dicionário original
for key in dates.keys():
	if key in update_fields and dates[key] is None:
		dates[key] = update_fields[key]
		print(dates)

export interface University {
  name: string
  domains: string[]
  country: string
}

// Major universities and colleges with their email domains
export const UNIVERSITIES: University[] = [
  // United States
  { name: "Harvard University", domains: ["harvard.edu"], country: "USA" },
  { name: "Stanford University", domains: ["stanford.edu"], country: "USA" },
  { name: "Massachusetts Institute of Technology", domains: ["mit.edu"], country: "USA" },
  { name: "Yale University", domains: ["yale.edu"], country: "USA" },
  { name: "Princeton University", domains: ["princeton.edu"], country: "USA" },
  { name: "Columbia University", domains: ["columbia.edu"], country: "USA" },
  { name: "University of California, Berkeley", domains: ["berkeley.edu"], country: "USA" },
  { name: "University of California, Los Angeles", domains: ["ucla.edu"], country: "USA" },
  { name: "University of Michigan", domains: ["umich.edu"], country: "USA" },
  { name: "Cornell University", domains: ["cornell.edu"], country: "USA" },
  { name: "University of Pennsylvania", domains: ["upenn.edu"], country: "USA" },
  { name: "Duke University", domains: ["duke.edu"], country: "USA" },
  { name: "Northwestern University", domains: ["northwestern.edu"], country: "USA" },
  { name: "University of Chicago", domains: ["uchicago.edu"], country: "USA" },
  { name: "New York University", domains: ["nyu.edu"], country: "USA" },
  { name: "Boston University", domains: ["bu.edu"], country: "USA" },
  { name: "University of Texas at Austin", domains: ["utexas.edu"], country: "USA" },
  { name: "University of Washington", domains: ["uw.edu"], country: "USA" },
  { name: "Georgia Institute of Technology", domains: ["gatech.edu"], country: "USA" },
  { name: "Carnegie Mellon University", domains: ["cmu.edu"], country: "USA" },
  
  // Canada - Universities
  { name: "University of Toronto", domains: ["utoronto.ca", "mail.utoronto.ca"], country: "Canada" },
  { name: "McGill University", domains: ["mcgill.ca", "mail.mcgill.ca"], country: "Canada" },
  { name: "University of British Columbia", domains: ["ubc.ca", "student.ubc.ca"], country: "Canada" },
  { name: "University of Alberta", domains: ["ualberta.ca"], country: "Canada" },
  { name: "McMaster University", domains: ["mcmaster.ca"], country: "Canada" },
  { name: "University of Montreal", domains: ["umontreal.ca"], country: "Canada" },
  { name: "University of Waterloo", domains: ["uwaterloo.ca", "edu.uwaterloo.ca"], country: "Canada" },
  { name: "Western University", domains: ["uwo.ca"], country: "Canada" },
  { name: "Queen's University", domains: ["queensu.ca"], country: "Canada" },
  { name: "University of Calgary", domains: ["ucalgary.ca"], country: "Canada" },
  { name: "Simon Fraser University", domains: ["sfu.ca"], country: "Canada" },
  { name: "Dalhousie University", domains: ["dal.ca"], country: "Canada" },
  { name: "University of Ottawa", domains: ["uottawa.ca"], country: "Canada" },
  { name: "York University", domains: ["yorku.ca"], country: "Canada" },
  { name: "University of Victoria", domains: ["uvic.ca"], country: "Canada" },
  { name: "Carleton University", domains: ["carleton.ca", "cmail.carleton.ca"], country: "Canada" },
  { name: "Toronto Metropolitan University", domains: ["torontomu.ca"], country: "Canada" },
  { name: "University of Manitoba", domains: ["umanitoba.ca"], country: "Canada" },
  { name: "University of Saskatchewan", domains: ["usask.ca"], country: "Canada" },
  { name: "University of Regina", domains: ["uregina.ca"], country: "Canada" },
  { name: "Memorial University of Newfoundland", domains: ["mun.ca"], country: "Canada" },
  { name: "University of New Brunswick", domains: ["unb.ca"], country: "Canada" },
  { name: "Concordia University", domains: ["concordia.ca"], country: "Canada" },
  { name: "University of Guelph", domains: ["uoguelph.ca"], country: "Canada" },
  { name: "University of Guelph-Humber", domains: ["guelphhumber.ca"], country: "Canada" },
  { name: "Laval University", domains: ["ulaval.ca"], country: "Canada" },
  { name: "Université du Québec à Montréal", domains: ["uqam.ca"], country: "Canada" },
  { name: "Brock University", domains: ["brocku.ca"], country: "Canada" },
  { name: "University of Windsor", domains: ["uwindsor.ca"], country: "Canada" },
  { name: "Lakehead University", domains: ["lakeheadu.ca"], country: "Canada" },
  { name: "Laurentian University", domains: ["laurentian.ca"], country: "Canada" },
  { name: "Trent University", domains: ["trentu.ca"], country: "Canada" },
  { name: "Wilfrid Laurier University", domains: ["wlu.ca"], country: "Canada" },
  { name: "University of Lethbridge", domains: ["uleth.ca"], country: "Canada" },
  { name: "Mount Allison University", domains: ["mta.ca"], country: "Canada" },
  { name: "Acadia University", domains: ["acadiau.ca"], country: "Canada" },
  { name: "University of Northern British Columbia", domains: ["unbc.ca"], country: "Canada" },
  { name: "Thompson Rivers University", domains: ["tru.ca"], country: "Canada" },
  { name: "University of the Fraser Valley", domains: ["ufv.ca"], country: "Canada" },
  { name: "Vancouver Island University", domains: ["viu.ca"], country: "Canada" },
  { name: "Emily Carr University of Art + Design", domains: ["ecuad.ca"], country: "Canada" },
  { name: "OCAD University", domains: ["ocadu.ca"], country: "Canada" },
  
  // Canada - Colleges
  { name: "Seneca College", domains: ["myseneca.ca"], country: "Canada" },
  { name: "Humber College", domains: ["humber.ca"], country: "Canada" },
  { name: "George Brown College", domains: ["georgebrown.ca"], country: "Canada" },
  { name: "Centennial College", domains: ["centennialcollege.ca"], country: "Canada" },
  { name: "Sheridan College", domains: ["sheridancollege.ca"], country: "Canada" },
  { name: "Algonquin College", domains: ["algonquincollege.com"], country: "Canada" },
  { name: "Mohawk College", domains: ["mohawkcollege.ca"], country: "Canada" },
  { name: "Conestoga College", domains: ["conestogac.on.ca"], country: "Canada" },
  { name: "Fanshawe College", domains: ["fanshawec.ca"], country: "Canada" },
  { name: "Durham College", domains: ["durhamcollege.ca"], country: "Canada" },
  { name: "St. Lawrence College", domains: ["sl.on.ca"], country: "Canada" },
  { name: "Niagara College", domains: ["niagaracollege.ca"], country: "Canada" },
  { name: "Cambrian College", domains: ["cambriancollege.ca"], country: "Canada" },
  { name: "Confederation College", domains: ["confederationcollege.ca"], country: "Canada" },
  { name: "Northern College", domains: ["northernc.on.ca"], country: "Canada" },
  { name: "Lambton College", domains: ["lambtoncollege.ca"], country: "Canada" },
  { name: "St. Clair College", domains: ["stclaircollege.ca"], country: "Canada" },
  { name: "Canadore College", domains: ["canadorecollege.ca"], country: "Canada" },
  { name: "Loyalist College", domains: ["loyalistcollege.com"], country: "Canada" },
  { name: "Fleming College", domains: ["flemingcollege.ca"], country: "Canada" },
  { name: "Georgian College", domains: ["georgianc.on.ca"], country: "Canada" },
  { name: "BCIT", domains: ["bcit.ca"], country: "Canada" },
  { name: "SAIT", domains: ["sait.ca"], country: "Canada" },
  { name: "NAIT", domains: ["nait.ca"], country: "Canada" },
  { name: "Red River College", domains: ["rrc.ca"], country: "Canada" },
  { name: "NSCC", domains: ["nscc.ca"], country: "Canada" },
  
  // UK
  { name: "University of Oxford", domains: ["ox.ac.uk"], country: "UK" },
  { name: "University of Cambridge", domains: ["cam.ac.uk"], country: "UK" },
  { name: "Imperial College London", domains: ["imperial.ac.uk"], country: "UK" },
  { name: "University College London", domains: ["ucl.ac.uk"], country: "UK" },
  
  // Australia
  { name: "Australian National University", domains: ["anu.edu.au"], country: "Australia" },
  { name: "University of Sydney", domains: ["sydney.edu.au"], country: "Australia" },
  { name: "University of Melbourne", domains: ["unimelb.edu.au"], country: "Australia" },
].sort((a, b) => a.name.localeCompare(b.name))

export function verifyUniversityEmail(email: string, selectedUniversity: string): {
  isValid: boolean
  university?: University
  message?: string
} {
  const emailDomain = email.toLowerCase().split("@")[1]
  
  if (!emailDomain) {
    return { isValid: false, message: "Invalid email format" }
  }

  // Find the selected university
  const university = UNIVERSITIES.find((uni) => uni.name === selectedUniversity)
  
  if (!university) {
    // If "Other" or not in university, skip verification
    return { isValid: true }
  }

  // Check if email domain matches any of the university's domains
  const domainMatches = university.domains.some((domain) => emailDomain === domain)

  if (!domainMatches) {
    return {
      isValid: false,
      message: `Email domain must be from ${university.name}. Expected: ${university.domains.join(" or ")}`,
    }
  }

  return { isValid: true, university }
}

export function getUniversityFromEmail(email: string): University | null {
  const emailDomain = email.toLowerCase().split("@")[1]
  
  if (!emailDomain) {
    return null
  }

  return UNIVERSITIES.find((uni) => uni.domains.some((domain) => emailDomain === domain)) || null
}

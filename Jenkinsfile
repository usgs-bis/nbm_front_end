def CMD = "rsync -urve 'ssh -o StrictHostKeyChecking=no' --exclude '.git' --exclude 'Jenkinsfile' --exclude '.gitignore' --exclude 'sonar-project.properties'"
def CSAHC_PATH = "igscsahcgw.cr.usgs.gov:/mnt/dist/websites/biogeography/beta/"

//def envMap = [
//"develop": "beta/",
//"master": "prod/"
//]

node {
    checkout scm

    stage('rsync nbm-front-end') {
        echo "Copying updated files from $branch"

        switch (branch) {
            case ["develop", "master"]:
//                CSAHC_PATH += envMap[branch]
                // -O here omits sending directory times 
                sh("${CMD} . ${CSAHC_PATH}")
                break
            default:
                sh("${CMD} . ${CSAHC_PATH}")
//                echo "No branch specifed"
        } 
    }
}


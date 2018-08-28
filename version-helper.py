
## Ben Gotthold 
## update the version in applicationProperties.js
## usage python version-helper.py --help

import argparse
import re
import subprocess


parser = argparse.ArgumentParser(description='Update an applications semantic versioning XX.XX.XX')

parser.add_argument("-j","--major", help="major version increase. XX.xx.xx",
                    action="store_true")
parser.add_argument("-m","--minor", help="major version increase. xx.XX.xx",
                    action="store_true")
parser.add_argument("-p","--patch", help="patch version increase. xx.xx.XX",
                    action="store_true")
parser.add_argument("-f","--file", type=str, help="path to file containing the application version string")

args = parser.parse_args()

defaultFilePath = 'applicationProperties.js'

if args.file:
    defaultFilePath = args.file
if (not args.major and not args.minor and not args.patch):
    args.patch = True

try:
    with open(defaultFilePath, 'r+') as appProperties:

        fileContents = appProperties.read()
        versionExpression = re.search(r'(\d+\.)?(\d+\.)?(\*|\d+)', fileContents)
        
        if( versionExpression.group(1) and versionExpression.group(2) and versionExpression.group(3)):
            pass
      
        oldVersion = versionExpression.group()
        fileContentsArray = fileContents.split(versionExpression.group(),1)
        versionArray = [versionExpression.group(1).replace(".", ""),versionExpression.group(2).replace(".", ""),versionExpression.group(3).replace(".", "")]

        if args.major:
            versionArray[0] = int(versionArray[0]) +1
            print('Major version increase to {}.'.format(versionArray[0]))
        if args.minor:
            versionArray[1] = int(versionArray[1]) +1
            print('Minor version increase to {}.'.format(versionArray[1]))
        if args.patch:
            versionArray[2] = int(versionArray[2]) +1
            print('Patch version increase to {}.'.format(versionArray[2]))
        
        appProperties.seek(0)
        newfileContents = '{}{}.{}.{}{}'.format(fileContentsArray[0],versionArray[0],versionArray[1],versionArray[2],fileContentsArray[1])
        appProperties.write(newfileContents)
        appProperties.truncate()
        appProperties.close()
        updateString = 'Updated application version from {} to {}.{}.{}'.format(oldVersion, versionArray[0],versionArray[1],versionArray[2])
        print (updateString)
        subprocess.call(["git", "add", defaultFilePath])
        subprocess.call(["git", "commit", "-m","\" {} \"".format(updateString)])


except AttributeError as e:
    print("No application version found")
    quit()

except Exception as e:
    print(e)
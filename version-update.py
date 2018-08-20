
try:
    with open('applicationProperties.js', 'r+') as appProperties:

        versionString = appProperties.read()
        minorVersion = int(versionString[-4] + versionString[-3]) + 1
        appProperties.seek(0)
        newVersion = versionString[:-4] + str(minorVersion) + '";'
        appProperties.write(newVersion)
        appProperties.truncate()
        appProperties.close()
        print ('Updated application version from {} to {}'.format(versionString[18:-2], newVersion[18:-2]))

except Exception as e:
    print(e)
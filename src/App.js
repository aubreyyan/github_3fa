import * as React from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import './App.css';
import LinearProgress from '@mui/material/LinearProgress';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Modal from '@mui/material/Modal';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import GithubSvg from './components/GithubSvg';


/**
 * ref: https://stackoverflow.com/a/38571132/8652920
 */
function shuffleArray(arr) {
    return arr.sort(() => 0.5 - Math.random());
}

function getNRandomRepos(repos, n) {
    const reposShuffled = shuffleArray(repos);
    return reposShuffled.slice(0, n);
}

/**
 * ref: https://docs.greptile.com/quickstart
 */
function getRepoId(branch, repoFullName) {
    return `github%3A${branch}%3A${repoFullName.replace("/", "%2F")}`;
}

async function repoHasBeenIndexed(branch, repoFullName) {
    await axios.get(`https://api.greptile.com/v2/repositories/${getRepoId(branch, repoFullName)}`, {
        headers: {
            "Authorization": "Bearer " + process.env.REACT_APP_GREPTILE_API_KEY,
        }
    }).then((resp) => {
        return true;
    }).catch((err) => {
        console.log(err)
        return false;
    });
}

function App() {
    const [username, setUsername] = React.useState("");
    const [githubToken, setGithubToken] = React.useState("");
    const [loginPending, setLoginPending] = React.useState(false);
    const [threeFAVisible, setThreeFAVisible] = React.useState(false);
    const [repoOptions, setRepoOptions] = React.useState([]);
    const [solutionRepo, setSolutionRepo] = React.useState(null);
    const [funFact, setFunFact] = React.useState("");
    const [successAlertVisible, setSuccessAlertVisible] = React.useState(false);
    const [errorAlertVisible, setErrorAlertVisible] = React.useState(false);

    function getFunFact(repo, allRepos) {
        axios.post("https://api.greptile.com/v2/query", {
            messages: [
                {
                    id: "0",
                    content: "Tell me a unique fun fact about this repository.",
                    role: "user"
                }
            ],
            repositories: [
                {
                    remote: "github",
                    repository: repo.full_name,
                    branch: repo.default_branch
                }
            ],
            sessionId: "0",
            stream: false,
            genius: false
        }, {
            headers: {
                "Authorization": "Bearer " + process.env.REACT_APP_GREPTILE_API_KEY,
                "Content-Type": "application/json",
                "X-GitHub-Token": githubToken
            }
        }).then(function (resp) {
            setFunFact(resp.data.message);
            allRepos.splice(allRepos.indexOf(repo), 1)
            setRepoOptions(shuffleArray(([repo].concat(getNRandomRepos(allRepos, 3)))));
        }).catch(function (err) {
            console.log(err);
        });
    }

    function checkAnswer(repo, answerButtonStateIdx) {
        if (successAlertVisible || errorAlertVisible) {
            return;
        }
        if (repo === solutionRepo.full_name) {
            setSuccessAlertVisible(true);
        } else {
            setErrorAlertVisible(true);
        }
    }

    async function handleLogin() {
        setLoginPending(true);
        let repos = [];
        axios.get(`https://api.github.com/users/${username}/repos`, {
            headers: {
                "Accept": "application/vnd.github+json",
                "Authorization": "Bearer " + githubToken,
                "X-GitHub-Api-Version": "2022-11-28"
            }
        }).then(function (resp) {
            repos = resp.data.map(r => (({full_name, default_branch}) => ({full_name, default_branch}))(r));
            let randomRepo = repos.length > 0 ? repos[Math.floor(Math.random() * repos.length)] : null;
// You can use this to hardcode the repo that is "randomly" selected, because I don't entirely have the logic to detect if a repo has been indexed completely working.
            randomRepo = {
                "full_name": "aubreyyan/openapi-converter-maven-plugin",
                "default_branch": "master"
            }
            setSolutionRepo(randomRepo);
            const repoIndexed = repoHasBeenIndexed(randomRepo.default_branch, randomRepo.full_name);
            if (!repoIndexed || true) {
                console.log("Repo has not been indexed, attempting to index...")
                axios.post("https://api.greptile.com/v2/repositories", {
                    remote: "github",
                    repository: randomRepo.full_name,
                    branch: randomRepo.default_branch,
                    reload: false,
                    notify: false
                }, {
                    headers: {
                        "Authorization": "Bearer " + process.env.REACT_APP_GREPTILE_API_KEY,
                        "Content-Type": "application/json",
                        "X-GitHub-Token": githubToken
                    }
                }).then((resp) => {
                    getFunFact(randomRepo, repos);
                }).catch((err) => {
                    console.log(err);
                })
            } else {
                console.log("Repo has been indexed.")
                getFunFact(randomRepo, repos);
            }
        }).catch(function (err) {
            console.log(err);
        });
    }

    React.useEffect(() => {
        if (repoOptions.length === 0) {
            return;
        }
        setLoginPending(false);
        setThreeFAVisible(true);
    }, [repoOptions]);

    return (
        <div className="App">
            <header className="App-header">
                <div style={{
                     position: 'absolute',
                     left: '50%',
                     top: '20%',
                     transform: 'translate(-50%, -50%)'
                }}>
                    <GithubSvg />
                    <p style={{color: "black", fontSize: 20}}>Sign in to Github</p>
                    <Stack direction="column" spacing={2}>
                        <Paper variant="outlined" square={false} style={{
                            padding: 25
                        }}>
                            <Box component="form">
                                <Stack direction="column">
                                    <p style={{color: "black", fontSize: 14, textAlign: "left"}}>
                                        Username or email address
                                    </p>
                                    <TextField onChange={(e) => {setUsername(e.target.value)}} size="small" variant="outlined" />
                                    <p style={{color: "black", fontSize: 14, textAlign: "left"}}>
                                        Password
                                    </p>
                                    <TextField onChange={(e) => {setGithubToken(e.target.value)}} size="small" variant="outlined" type="password" />
                                </Stack>
                            </Box>
                            <Button variant="contained" color="success" disableElevation fullWidth style={{
                                textTransform: "none"
                            }} onClick={handleLogin}>
                                Sign in
                            </Button>
                            {loginPending ? <LinearProgress /> : null}
                        </Paper>
                    </Stack>
                </div>
            </header>
            <Modal open={threeFAVisible}>
                <Box style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    bgcolor: 'background.paper',
                }}>
                    <Paper variant="outlined" square={false} style={{
                        padding: 25,
                    }}>
                        <p>Github 3FA Check</p>
                        <p>{funFact}</p>
                        <p>Which repo best matches this description?</p>
                        <ButtonGroup orientation="vertical">
                            {repoOptions.map((r, idx) => <Button key={idx} onClick={() => checkAnswer(r.full_name, idx)}>{r.full_name}</Button>)}
                        </ButtonGroup>
                    </Paper>
                    {successAlertVisible ? <Alert severity="success"><AlertTitle>Success</AlertTitle>Logging you in...</Alert> : null}
                    {errorAlertVisible ? <Alert severity="error"><AlertTitle>Error</AlertTitle>3FA Authentication Failed</Alert> : null}
                </Box>
            </Modal>
        </div>
    );
}

export default App;
